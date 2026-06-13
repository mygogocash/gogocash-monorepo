"use client";
import React from "react";
import ComponentCard from "../../common/ComponentCard";

import { Modal } from "../../ui/modal";
import Button from "../../ui/button/Button";
import { useModal } from "@/hooks/useModal";

export default function DefaultModal() {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    closeModal();
  };
  return (
    <div>
      <ComponentCard title="Default Modal">
        <Button size="sm" onClick={openModal}>
          Open Modal
        </Button>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[600px] p-5 lg:p-10"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 text-title-sm dark:text-white/90">
              Modal Heading
            </h4>
            <div className="flex shrink-0 items-center gap-3">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400 mt-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Pellentesque euismod est quis mauris lacinia pharetra. Sed a ligula
            ac odio condimentum aliquet a nec nulla. Aliquam bibendum ex sit
            amet ipsum rutrum feugiat ultrices enim quam.
          </p>
          <p className="mt-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Pellentesque euismod est quis mauris lacinia pharetra. Sed a ligula
            ac odio.
          </p>
        </Modal>
      </ComponentCard>
    </div>
  );
}
