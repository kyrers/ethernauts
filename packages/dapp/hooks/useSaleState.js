import { useContext, useState, useCallback } from 'react';
import { Contract } from 'ethers';

import { WalletContext } from '../contexts/WalletProvider';

import { ABI, TOKEN_ADDRESS } from '../config';
import { saleState } from '../constants/sale-state';

const useSaleState = () => {
  const [data, setData] = useState(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { state } = useContext(WalletContext);

  const fetchSaleState = useCallback(async () => {
    try {
      setIsError(false);
      setIsLoading(true);
      if (state.web3Provider) {
        const signer = state.web3Provider.getSigner();

        const contract = new Contract(TOKEN_ADDRESS, ABI, signer);

        const currentSaleState = await contract.currentSaleState();

        setData(saleState[currentSaleState.toString()]);
      }
    } catch (err) {
      console.error(err);
      setIsError(err.message);
    }
    setIsLoading(false);
  }, [state.web3Provider]);

  return [{ data, isLoading, isError }, fetchSaleState];
};

export default useSaleState;
