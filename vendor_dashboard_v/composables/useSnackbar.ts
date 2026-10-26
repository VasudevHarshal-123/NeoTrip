// composables/useSnackbar.ts
import { useSnackbarStore } from '~/store/snackbar';

export function useSnackbar() {
  const snackbarStore = useSnackbarStore();

  return {
    show: snackbarStore.showSnackbar,
    success: snackbarStore.showSuccess,
    error: snackbarStore.showError,
    warning: snackbarStore.showWarning,
    info: snackbarStore.showInfo,
  };
}
