"use client";
import { env } from "@/env";
import { ethers, keccak256, solidityPacked } from "ethers";
import contractPolygonAbi from "@/constants/abi/CashbackLedgerPolygonAbi.json";
import contractBNBAbi from "@/constants/abi/CashbackLedgerBNBAbi.json";
import contractSonicAbi from "@/constants/abi/CashbackLedgerSONICAbi.json";
import contractCeloAbi from "@/constants/abi/CashbackLedgerCELOAbi.json";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import client from "@/lib/axios/client";
import { ResWithdrawBankTransfer } from "@/interfaces/withdraw";
import React from "react";
import { BankSelected } from "@/features/wallet/component/MyWalletWithdraw";
import { useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { rateCurrency } from "@/lib/utils";
import { ResponseWithdrawCheckMyCashback } from "@/interfaces/auth";
import { getEip1193ErrorCode } from "@/lib/web3/eip1193";
import { withdrawChainIdHex } from "@/lib/web3/withdrawChain";
export const chainAll = [
  {
    label: "Sonic",
    value: Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC),
  },
  {
    label: "Polygon",
    value: Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON),
  },
  {
    label: "BNB",
    value: Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB),
  },
  {
    label: "CELO",
    value: Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_CELO),
  },
];
export class CreateWithdrawDto {
  tx_hash?: string;
  address?: string;
  account_name?: string;
  bank_name?: string;
  account_number?: string;
  conversion_ids?: string[];
  percent_fee?: number;
  amount_total?: number;
  amount_net?: number;
  method?: string;
  currency?: string;
  chain?: number;
  mycashback_id?: string[];
}

const useWithdrawMyCashback = () => {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [bankSelect, setBankSelect] = React.useState<BankSelected | null>(null);

  const [chainIdSelect, setChainIdSelect] = useState<number | null>(chainAll[0]?.value ?? null); //14601 80002 97
  const [loading, setLoading] = useState<boolean>(false);
  const checkAccount = async () => {
    try {
      const ethereum = window.ethereum;
      if (ethereum) {
        const provider = new ethers.BrowserProvider(ethereum);
        if (provider) {
          const signer = await provider.getSigner();
          const network = await provider.getNetwork();
          const address = await signer.getAddress();

          setAccount(address);
          setChainId(Number(network.chainId));

          //   console.log('✅ Wallet connected:', address);
          //   console.log('🌐 Chain ID:', network.chainId);
        }
      }
    } catch {
      // Wallet not available or user rejected — silent on mount
    }
  };
  useEffect(() => {
    checkAccount();
  }, []);
  async function connectWallet() {
    try {
      const ethereum = window.ethereum;
      if (!ethereum) {
        alert("🚨 Please install MetaMask first!");
        return;
      }

      // ขอสิทธิ์เข้าถึงบัญชีใน MetaMask
      await ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      const address = await signer.getAddress();

      setAccount(address);
      setChainId(Number(network.chainId));
    } catch {
      toast.error("Could not connect wallet.");
    }
  }
  const singnatureForWithdraw = async (msg: {
    userid: string;
    userAddress: string;
    totalCashbackAmount: string;
    conversionIdHashes: string[];
    expireAt: number;
    chain: number;
  }) => {
    try {
      const signature = await client.post(`/withdraw/signature`, { ...msg });
      return signature.data;
    } catch {
      return false;
    }
  };

  const createWithdraw = async (data: CreateWithdrawDto) => {
    try {
      const dt = await client.post(`/withdraw`, data);

      if (dt.status === 201) {
        toast.success("Withdraw record created successfully.");
      } else {
        toast.error("Failed to create withdraw record.");
      }
    } catch {
      toast.error("Failed to create withdraw record.");
    }
  };

  const switchNetwork = async (): Promise<void> => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      toast.error("Please install MetaMask first.");
      return;
    }
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: withdrawChainIdHex(chainIdSelect!) }],
      });
      const provider = new ethers.BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (switchError: unknown) {
      if (getEip1193ErrorCode(switchError) === 4902) {
        toast.error("Network not found. Add it to MetaMask first.");
      }
      throw switchError;
    }
  };
  async function withdrawCashback(msg_: {
    userid: string;
    userAddress: string;
    totalCashbackAmount: string;
    conversionIdHashes: string[];
    expireAt: number;
    info?: ResponseWithdrawCheckMyCashback;
  }) {
    try {
      //   console.log('Initiating withdrawCashback with message:', msg_);

      const ethereum = window.ethereum;
      if (!ethereum) throw new Error("MetaMask not found");

      if (!account) {
        toast.error("Please connect wallet first.");
        throw new Error("Wallet not connected");
      }
      const chainIdCheck =
        chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON)
          ? Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON)
          : chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB)
            ? Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB)
            : chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC)
              ? Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC)
              : Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_CELO);
      if (chainIdSelect !== chainIdCheck) {
        // await switchNetwork();
        toast.error("Please connect to the correct network.");
        throw new Error("Incorrect network");
      }
      const msgForSign = {
        userid: msg_.userid,
        userAddress: msg_.userAddress,
        totalCashbackAmount: msg_.totalCashbackAmount,
        conversionIdHashes: msg_.conversionIdHashes.map((id) => id),
        expireAt: msg_.expireAt,
        chain: chainIdSelect!,
      };
      const signature = await singnatureForWithdraw(msgForSign);

      if (!signature) {
        toast.error("Failed to get signature for withdrawal.");
        throw new Error("Signature generation failed");
      }
      // ขอสิทธิ์เชื่อมต่อกับ MetaMask
      await ethereum.request({ method: "eth_requestAccounts" });

      // provider + signer จาก MetaMask
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      // สร้าง instance ของ contract
      const contractAddress =
        chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON)
          ? env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_POLYGON!
          : chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB)
            ? env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_BNB!
            : chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC)
              ? env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_SONIC!
              : env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_CELO!;

      const abi =
        chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_POLYGON)
          ? contractPolygonAbi
          : chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB)
            ? contractBNBAbi
            : chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC)
              ? contractSonicAbi
              : contractCeloAbi;
      const contract = new ethers.Contract(contractAddress, abi, signer);

      let rolling = ethers.ZeroHash;
      for (const id of msg_.conversionIdHashes) {
        rolling = keccak256(solidityPacked(["bytes32", "uint256"], [rolling, id]));
      }
      const conversionIdsHash = rolling;

      const decimal = chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_BNB) ? 18 : 6;

      const dt = {
        userid: msg_.userid,
        userAddress: msg_.userAddress,
        amount: ethers.parseUnits(msg_.totalCashbackAmount, decimal).toString(),
        expireAt: BigInt(msg_.expireAt),
        conversionIdsHash: conversionIdsHash,
      };
      // console.log('dt', dt);

      //   const tx = await signer.sendTransaction({
      //     to: env.NEXT_PUBLIC_CONTRACT_WITHDRAW_ADDRESS_POLYGON!,
      //     from: account,
      //     data: contract.interface.encodeFunctionData('withdrawCashback', [
      //       dt,
      //       msg_.conversionIdHashes,
      //       signature,
      //     ]),
      //   });

      const withdraw = contract.withdrawCashback;
      if (!withdraw) throw new Error("withdrawCashback is not available on contract");
      const tx = await withdraw(dt, msg_.conversionIdHashes, signature);
      const receipt = await tx.wait();
      //   console.log('Transaction sent:', tx.hash);
      //   console.log('Transaction receipt:', receipt);
      if (receipt && msg_.info) {
        createWithdraw({
          tx_hash: receipt.hash,
          address: account,
          method: "web3",
          currency:
            chainIdSelect === Number(env.NEXT_PUBLIC_CHAIN_ID_WITHDRAW_SONIC) ? "USDC" : "USDT",
          account_name: "",
          bank_name: "",
          account_number: "",
          // percent_fee: msg_.info?.feePercentage || 0,
          amount_total: msg_.info?.totalMyCashbackUSD || 0,
          // amount_net: msg_.info?.netMyCashbackUSD || 0,
          conversion_ids: [],
          chain: chainIdSelect,
          mycashback_id: msg_.info?.conversionIdMyCashback,
        });
      }

      //   console.log('✅ Withdraw successful:', receipt);
    } catch {
      toast.error("Withdrawal failed. Please try again.");
      throw new Error("Withdrawal failed. Please try again.");
    }
  }

  const createTransactionWithdrawBank = async (data: CreateWithdrawDto) => {
    try {
      const dt = await client.post<ResWithdrawBankTransfer>(`/withdraw/bank-transfer`, data);
      if (dt.data?.status === "success") {
        toast.success("Bank transfer withdraw request created successfully.");
        router.push("/wallet?active=withdraw");
      }
    } catch {
      toast.error("Failed to create bank transfer withdraw request.");
      router.push("/wallet?active=withdraw");
    }
  };

  const { data: rateCurrencyData } = useQuery({
    queryKey: ["rateCurrency"],
    queryFn: () => rateCurrency("USD"),
  });
  return {
    withdrawCashback,
    createTransactionWithdrawBank,
    account,
    chainId,
    connectWallet,
    switchNetwork,
    loading,
    setLoading,
    chainIdSelect,
    setChainIdSelect,
    bankSelect,
    setBankSelect,
    rateCurrencyData,
  };
};

export default useWithdrawMyCashback;
