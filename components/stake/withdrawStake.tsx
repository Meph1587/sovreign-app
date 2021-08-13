import { TOKEN_ADDRESSES } from "@/constants";
import useReignFacet from "@/hooks/contracts/useReignFacet";
import useFormattedBigNumber from "@/hooks/useFormattedBigNumber";
import useInput from "@/hooks/useInput";
import useWeb3Store from "@/hooks/useWeb3Store";
import useReignStaked from "@/hooks/view/useReignStaked";
import useTokenBalance from "@/hooks/view/useTokenBalance";
import handleError from "@/utils/handleError";
import type { TransactionResponse } from "@ethersproject/providers";
import { formatUnits, parseUnits } from "@ethersproject/units";
import classNames from "classnames";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { TransactionToast } from "../customToast";
import NumericalInput from "../numericalInput";
import { TokenSingle } from "../tokenSelect";

dayjs.extend(relativeTime);

export default function WithdrawStake() {
  const account = useWeb3Store((state) => state.account);
  const chainId = useWeb3Store((state) => state.chainId);

  const { mutate: reignBalanceMutate } = useTokenBalance(
    account,
    TOKEN_ADDRESSES.REIGN[chainId]
  );

  const { data: reignStaked, mutate: reignStakedMutate } = useReignStaked();

  const reignFacet = useReignFacet();

  const withdrawInput = useInput();

  const formattedReignStaked = useFormattedBigNumber(reignStaked);

  async function withdrawReign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const _id = toast.loading("Waiting for confirmation");

    try {
      const amountToWithdraw = parseUnits(withdrawInput.value);

      if (amountToWithdraw.gt(reignStaked)) {
        throw new Error(`Maximum Withdraw: ${formattedReignStaked} REIGN`);
      }

      const transaction: TransactionResponse = await reignFacet.withdraw(
        amountToWithdraw
      );

      toast.loading(
        <TransactionToast
          hash={transaction.hash}
          chainId={chainId}
          message={`Withdraw ${withdrawInput.value} REIGN`}
        />,
        { id: _id }
      );

      await transaction.wait();

      toast.success(
        <TransactionToast
          hash={transaction.hash}
          chainId={chainId}
          message={`Withdraw ${withdrawInput.value} REIGN`}
        />,
        { id: _id }
      );

      reignStakedMutate();
      reignBalanceMutate();
    } catch (error) {
      handleError(error, _id);
    }
  }

  const inputIsMax =
    !!reignStaked && withdrawInput.value === formatUnits(reignStaked);

  const setMax = () => {
    withdrawInput.setValue(formatUnits(reignStaked));
  };

  return (
    <form method="POST" onSubmit={withdrawReign} className="space-y-4">
      <div className="flex justify-between">
        <h2 className="font-medium leading-5">Withdraw Stake</h2>
      </div>

      <div>
        <div className="flex space-x-4 mb-2">
          <TokenSingle symbol="REIGN" />

          <div className="flex-1">
            <label className="sr-only" htmlFor="stakeWithdraw">
              Enter amount of REIGN to withdraw
            </label>

            <NumericalInput
              id="stakeWithdraw"
              name="stakeWithdraw"
              required
              {...withdrawInput.valueBind}
            />
          </div>
        </div>

        <p className="text-sm text-gray-300 h-5">
          {reignStaked && formattedReignStaked ? (
            <>
              <span>{`Available: ${formattedReignStaked} REIGN`}</span>{" "}
              {!inputIsMax && (
                <button
                  type="button"
                  className="text-indigo-500"
                  onClick={setMax}
                >
                  {`(Max)`}
                </button>
              )}
            </>
          ) : null}
        </p>
      </div>

      <div className="space-y-4">
        <button
          className={classNames(
            "p-4 w-full rounded-md text-lg font-medium leading-5 focus:outline-none focus:ring-4",
            withdrawInput.hasValue ? "bg-white text-primary" : "bg-primary-300"
          )}
          disabled={!withdrawInput.hasValue}
          type="submit"
        >
          {withdrawInput.hasValue ? "Withdraw" : "Enter an amount"}
        </button>
      </div>
    </form>
  );
}
