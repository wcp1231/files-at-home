import { create } from 'zustand';

interface PassphraseRequest {
  isOpen: boolean;
  resolve: (value: string) => void;
}

interface DialogState {
  passphraseRequest: PassphraseRequest | null;
  askForPassphrase: (title?: string, message?: string) => Promise<string>;
  confirmPassphrase: (passphrase: string) => void;
  cancelPassphrase: () => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  passphraseRequest: null,

  askForPassphrase: async () => {
    return new Promise<string>((resolve) => {
      set({
        passphraseRequest: {
          isOpen: true,
          resolve
        }
      });
    });
  },

  confirmPassphrase: (passphrase: string) => {
    const { passphraseRequest } = get();
    if (passphraseRequest) {
      passphraseRequest.resolve(passphrase);
      set({ passphraseRequest: null });
    }
  },

  cancelPassphrase: () => {
    const { passphraseRequest } = get();
    if (passphraseRequest) {
      passphraseRequest.resolve('');
      set({ passphraseRequest: null });
    }
  }
}));