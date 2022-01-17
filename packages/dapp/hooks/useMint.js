import { useContext, useState } from 'react';
import { Contract, utils } from 'ethers';

import { WalletContext } from '../contexts/WalletProvider';
import { DonationContext } from '../contexts/DonationProvider';

import { ABI, TOKEN_ADDRESS } from '../config';
import { zeroAccount } from '../constants/common';

const useMint = () => {
  const [data, setData] = useState(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { state } = useContext(WalletContext);
  const { donation } = useContext(DonationContext);

  const fetchMint = async () => {
    try {
      setIsError(false);
      setIsLoading(true);
      if (state.web3Provider) {
        const signer = state.web3Provider.getSigner();

        const contract = new Contract(TOKEN_ADDRESS, ABI, signer);

        await contract.mint({
          value: utils.parseEther(String(donation)),
        });

        contract.on('Transfer', async (from, to, amount, evt) => {
          if (from !== zeroAccount) return;
          if (to !== state.address) return;

          const tokenId = evt.args.tokenId.toString();

          setData(tokenId);

          setIsLoading(false);
        });
      }
    } catch (err) {
      console.error(err);
      setIsError(err.message);
      setIsLoading(false);
    }
  };

  return [{ data, isLoading, isError }, fetchMint];
};

export default useMint;
