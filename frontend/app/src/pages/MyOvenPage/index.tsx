import { CircularProgress, Grid, Box } from '@material-ui/core';
import { useSelector, useDispatch } from 'react-redux';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../../components/Drawer/Drawer';
import { OvenActions } from '../../components/OvenActions/OvenActions';
import { OvenCard } from '../../components/OvenCard/OvenCard';
import Page from '../../components/Page';
import { useWallet } from '../../wallet/hooks';
import { RootState } from '../../redux/rootReducer';
import { OvenSlice } from '../../redux/slices/OvenSlice';
import { UserOvenStats } from '../../interfaces';
import { getOvenImageId, getOvenMaxCtez, toSerializeableOven } from '../../utils/ovenUtils';
import { useCtezBaseStats, useOvenData } from '../../api/queries';
import { isMonthFromLiquidation } from '../../api/contracts';

export const MyOvenPage: React.FC = () => {
  const { t } = useTranslation(['common', 'header']);
  const dispatch = useDispatch();
  const currentTarget = useSelector((state: RootState) => state.stats.baseStats?.originalTarget);
  const { showActions, userOvenData } = useSelector((state: RootState) => state.oven);
  const [{ pkh: userAddress }] = useWallet();
  const { data: ovenData, isLoading } = useOvenData(userAddress);
  const { data: baseStats } = useCtezBaseStats();
  useEffect(() => {
    if (ovenData && ovenData.length > 0) {
      const ovenUserData: UserOvenStats = ovenData.reduce(
        (acc, item) => {
          acc.ctez += item.ctez_outstanding.shiftedBy(-6).toNumber();
          acc.xtz += item.tez_balance.shiftedBy(-6).toNumber();
          return acc;
        },
        { xtz: 0, ctez: 0, totalOvens: ovenData.length },
      );
      dispatch(OvenSlice.actions.setUserOvenData(ovenUserData));
    }
  }, [ovenData]);
  return (
    <Page showStats>
      {isLoading && <CircularProgress />}
      {!isLoading && (
        <Grid
          container
          direction="row"
          alignItems="flex-start"
          justifyItems="flex-start"
          spacing={3}
        >
          {ovenData &&
            ovenData.length > 0 &&
            ovenData
              .sort((a, b) => b.ovenId - a.ovenId)
              .map((ovenValue, index) => {
                const isMonthAway =
                  baseStats && userOvenData
                    ? isMonthFromLiquidation(
                        userOvenData.ctez,
                        Number(baseStats?.currentTarget),
                        userOvenData.xtz,
                        baseStats?.drift,
                      )
                    : false;
                const { max } = currentTarget
                  ? getOvenMaxCtez(
                      ovenValue.tez_balance.toString(),
                      ovenValue.ctez_outstanding.toString(),
                      currentTarget,
                    )
                  : { max: 0 };
                return (
                  <Grid item key={`${ovenValue.address}-${index}`}>
                    <OvenCard
                      {...ovenValue}
                      isMonthAway={isMonthAway}
                      maxCtez={max}
                      imageId={getOvenImageId(ovenValue.ovenId, ovenData.length)}
                      action={() => {
                        dispatch(OvenSlice.actions.setOven(toSerializeableOven(ovenValue)));
                        dispatch(OvenSlice.actions.toggleActions(true));
                      }}
                    />
                  </Grid>
                );
              })}
        </Grid>
      )}
      {!isLoading && userAddress && ovenData?.length === 0 && <Box p={3}>{t('noOvens')}</Box>}
      {!isLoading && ovenData && ovenData.length > 0 && (
        <Drawer
          open={showActions}
          onClose={() => {
            dispatch(OvenSlice.actions.clearOven());
          }}
        >
          <OvenActions />
        </Drawer>
      )}
    </Page>
  );
};
