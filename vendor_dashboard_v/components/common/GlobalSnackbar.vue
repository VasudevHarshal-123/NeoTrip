<!-- components/common/GlobalSnackbar.vue -->
<script setup lang="ts">
import { useSnackbarStore } from '~/store/snackbar';

const snackbarStore = useSnackbarStore();
</script>

<template>
  <v-snackbar
    v-model="snackbarStore.show"
    :color="snackbarStore.color"
    :timeout="snackbarStore.timeout"
    location="bottom right"
  >
    {{ snackbarStore.message }}
    
    <template #actions>
      <v-btn
        variant="text"
        @click="snackbarStore.hideSnackbar()"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>
