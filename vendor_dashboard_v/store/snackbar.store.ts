// store/snackbar.ts
import { defineStore } from 'pinia';

interface SnackbarState {
  show: boolean;
  message: string;
  color: string;
  timeout: number;
}

export const useSnackbarStore = defineStore('snackbar', {
  state: (): SnackbarState => ({
    show: false,
    message: '',
    color: 'info',
    timeout: 5000,
  }),

  actions: {
    showSnackbar(message: string, color: string = 'info', timeout: number = 5000) {
      this.message = message;
      this.color = color;
      this.timeout = timeout;
      this.show = true;
    },

    showSuccess(message: string) {
      this.showSnackbar(message, 'success');
    },

    showError(message: string) {
      this.showSnackbar(message, 'error');
    },

    showWarning(message: string) {
      this.showSnackbar(message, 'warning');
    },

    showInfo(message: string) {
      this.showSnackbar(message, 'info');
    },

    hideSnackbar() {
      this.show = false;
    },
  },
});
