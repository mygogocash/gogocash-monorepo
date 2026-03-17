"use client";
import { useModal } from "@/hooks/useModal";
import ComponentCard from "../../common/ComponentCard";

import Button from "../../ui/button/Button";
import { Modal } from "../../ui/modal";

export default function FullScreenModal() {
  const {
    isOpen: isFullscreenModalOpen,
    openModal: openFullscreenModal,
    closeModal: closeFullscreenModal,
  } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeFullscreenModal();
  };
  return (
    <ComponentCard title="Full Screen Modal">
      <Button size="sm" onClick={openFullscreenModal}>
        Open Modal
      </Button>
      <Modal
        isOpen={isFullscreenModalOpen}
        onClose={closeFullscreenModal}
        isFullscreen={true}
        showCloseButton={true}
      >
        <div className="fixed top-0 left-0 flex flex-col w-full h-screen p-6 overflow-x-hidden overflow-y-auto bg-white dark:bg-gray-900 lg:p-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 shrink-0">
            <h4 className="font-semibold text-gray-800 text-title-sm dark:text-white/90">
              Modal Heading
            </h4>
            <div className="flex shrink-0 items-center gap-3">
              <Button size="sm" variant="outline" onClick={closeFullscreenModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Pellentesque euismod est quis mauris lacinia pharetra. Sed a
              ligula ac odio condimentum aliquet a nec nulla. Aliquam bibendum
              ex sit amet ipsum rutrum feugiat ultrices enim quam.
            </p>
            <p className="mt-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Pellentesque euismod est quis mauris lacinia pharetra. Sed a
              ligula ac odio condimentum aliquet a nec nulla. Aliquam bibendum
              ex sit amet ipsum rutrum feugiat ultrices enim quam odio
              condimentum aliquet a nec nulla pellentesque euismod est quis
              mauris lacinia pharetra.
            </p>
            <p className="mt-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Pellentesque euismod est quis mauris lacinia pharetra.
            </p>
          </div>
        </div>
      </Modal>
    </ComponentCard>
  );
}
