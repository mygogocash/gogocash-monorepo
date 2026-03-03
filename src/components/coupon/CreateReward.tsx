"use client";

import { useState } from "react";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import CircularProgress from "@mui/material/CircularProgress";

const CreateReward = () => {
  const { data } = useSession();
  const session = data as { accessToken?: string };
  const [loading, setLoading] = useState(false);

  const defaultFormState = {
    reward_type: "",
    reward_amount: "",
    reward_currency: "THB",
    user: "",
  };
  const [form, setForm] = useState(defaultFormState);

  const handleCreateReward = () => {
    // Logic to create a reward goes here
    setLoading(true);
    client
      .post("/withdraw/create-conversion-reward", form, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })
      .then((response) => {
        console.log("Reward created successfully:", response.data);
        toast.success("Reward created successfully!");
        setForm(defaultFormState);
      })
      .catch((error) => {
        console.error("Error creating reward:", error);
        toast.error(
          error?.data?.message || "Failed to create reward. Please try again.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1>Create Reward</h1>

        {/* Form for creating a reward goes here */}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Input
          title="Reward Name Ex.[Quest (202602), Ang Pao (202602), etc]"
          onChange={(event) => {
            setForm({ ...form, reward_type: event.target.value });
          }}
          placeholder="Quest (202602)"
          value={form.reward_type}
        />
        <Input
          title="Reward Amount"
          onChange={(event) => {
            setForm({ ...form, reward_amount: event.target.value });
          }}
          placeholder="0"
          value={form.reward_amount}
        />
        <Input
          title="Reward Currency Ex.[THB, USD]"
          onChange={(event) => {
            setForm({ ...form, reward_currency: event.target.value });
          }}
          placeholder="THB"
          defaultValue={"THB"}
          value={form.reward_currency}
        />
        <Input
          title="Reward User Ex.[email or mobile]"
          onChange={(event) => {
            setForm({ ...form, user: event.target.value });
          }}
          placeholder="0955555555"
          value={form.user}
        />
      </div>
      <button
        disabled={loading}
        onClick={handleCreateReward}
        className="bg-brand-500 hover:bg-brand-600 mt-5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white"
      >
        {loading && <CircularProgress size={15} />}
        Create Reward
      </button>
    </div>
  );
};

export default CreateReward;
