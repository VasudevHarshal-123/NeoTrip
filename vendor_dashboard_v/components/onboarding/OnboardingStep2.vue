<!-- 
  File: components/OnboardingStep2.vue
  Path: components/OnboardingStep2.vue
  Description: Step 2 - Upload Documents (PAN, Aadhaar, Bank Details)
-->

<script setup>
import { ref, computed } from "vue";
import { processImageFile, formatFileSize } from "~/utils/imageCompression";

// Props
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      bankAccountNumber: "",
      bankName: "",
      bankBranch: "",
      bankIfscCode: "",
      upiId: "",
      gstin: "",
      panNumber: "",
      aadhaarNumber: "",
      panCardFile: null,
      aadhaarCardFile: null,
      passbookPhotoFile: null,
      panCardPreview: null,
      aadhaarCardPreview: null,
      passbookPreview: null,
    }),
  },
});

// Emits
const emit = defineEmits(["update:modelValue"]);

// Local state
const formData = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const uploading = ref({
  pan: false,
  aadhaar: false,
  passbook: false,
});

// File input refs
const panFileInput = ref(null);
const aadhaarFileInput = ref(null);
const passbookFileInput = ref(null);

// Validation rules
const panRules = [
  (v) => !!v || "PAN number is required",
  (v) =>
    /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v) ||
    "Enter valid PAN (e.g., ABCDE1234F)",
];

const aadhaarRules = [
  (v) => !!v || "Aadhaar number is required",
  (v) => /^\d{12}$/.test(v) || "Enter valid 12-digit Aadhaar number",
];

const bankAccountRules = [
  (v) => !!v || "Bank account number is required",
  (v) =>
    /^\d{9,18}$/.test(v) || "Enter valid bank account number (9-18 digits)",
];

const bankNameRules = [
  (v) => !!v || "Bank name is required",
  (v) => v.length >= 3 || "Bank name must be at least 3 characters",
];

// File upload handlers
const handleFileSelect = async (event, fileType) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    uploading.value[fileType] = true;

    // Compress image
    const result = await processImageFile(file, 500);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewKey = `${fileType}CardPreview`;
      if (fileType === "passbook") {
        formData.value.passbookPreview = e.target.result;
      } else {
        formData.value[previewKey] = e.target.result;
      }
    };
    reader.readAsDataURL(result.file);

    // Store file
    const fileKey = `${fileType}CardFile`;
    if (fileType === "passbook") {
      formData.value.passbookPhotoFile = result.file;
    } else {
      formData.value[fileKey] = result.file;
    }
  } catch (error) {
    console.error(`Error processing ${fileType}:`, error);
    alert("Failed to process image. Please try again.");
  } finally {
    uploading.value[fileType] = false;
  }
};

const isValid = computed(() => {
  return (
    /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.value.panNumber) &&
    /^\d{12}$/.test(formData.value.aadhaarNumber) &&
    /^\d{9,18}$/.test(formData.value.bankAccountNumber) &&
    formData.value.bankName?.length >= 3 &&
    formData.value.bankIfscCode?.length >= 11 && // ✅ NEW
    formData.value.panCardFile &&
    formData.value.aadhaarCardFile &&
    formData.value.passbookPhotoFile
  );
});

defineExpose({ isValid });
</script>

<template>
  <div class="onboarding-step">
    <!-- Header -->
    <div class="mb-8 text-center">
      <h2 class="text-h4 font-weight-bold mb-2">Upload Documents</h2>
      <p class="text-body-1 text-medium-emphasis">
        Upload your personal documents to verify your identity.
      </p>
    </div>

    <v-row>
      <!-- PAN Card Number -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.panNumber"
          label="PAN Card Number"
          placeholder="ABCDE1234F"
          variant="outlined"
          prepend-inner-icon="mdi-card-account-details-outline"
          :rules="panRules"
          required
          density="comfortable"
          @input="formData.panNumber = formData.panNumber.toUpperCase()"
        />
      </v-col>

      <!-- Aadhaar Card Number -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.aadhaarNumber"
          label="Aadhaar Card Number"
          placeholder="123456789012"
          variant="outlined"
          prepend-inner-icon="mdi-card-account-details-outline"
          :rules="aadhaarRules"
          type="tel"
          maxlength="12"
          required
          density="comfortable"
        />
      </v-col>

      <!-- Upload PAN Card -->
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="pa-4">
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            Upload PAN Card
            <v-chip
              v-if="formData.panCardFile"
              color="success"
              size="x-small"
              class="ml-2"
            >
              <v-icon icon="mdi-check" start size="14" />
              Uploaded
            </v-chip>
          </h4>

          <div v-if="formData.panCardPreview" class="mb-3">
            <v-img
              :src="formData.panCardPreview"
              height="150"
              cover
              class="rounded"
            />
            <p class="text-caption text-center mt-2">
              {{ formatFileSize(formData.panCardFile?.size) }}
            </p>
          </div>

          <input
            ref="panFileInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            hidden
            @change="(e) => handleFileSelect(e, 'pan')"
          />

          <v-btn
            block
            variant="outlined"
            color="primary"
            prepend-icon="mdi-upload"
            :loading="uploading.pan"
            @click="panFileInput?.click()"
          >
            {{ formData.panCardFile ? "Change" : "Upload" }}
          </v-btn>
        </v-card>
      </v-col>

      <!-- Upload Aadhaar Card -->
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="pa-4">
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            Upload Aadhaar Card
            <v-chip
              v-if="formData.aadhaarCardFile"
              color="success"
              size="x-small"
              class="ml-2"
            >
              <v-icon icon="mdi-check" start size="14" />
              Uploaded
            </v-chip>
          </h4>

          <div v-if="formData.aadhaarCardPreview" class="mb-3">
            <v-img
              :src="formData.aadhaarCardPreview"
              height="150"
              cover
              class="rounded"
            />
            <p class="text-caption text-center mt-2">
              {{ formatFileSize(formData.aadhaarCardFile?.size) }}
            </p>
          </div>

          <input
            ref="aadhaarFileInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            hidden
            @change="(e) => handleFileSelect(e, 'aadhaar')"
          />

          <v-btn
            block
            variant="outlined"
            color="primary"
            prepend-icon="mdi-upload"
            :loading="uploading.aadhaar"
            @click="aadhaarFileInput?.click()"
          >
            {{ formData.aadhaarCardFile ? "Change" : "Upload" }}
          </v-btn>
        </v-card>
      </v-col>

      <!-- Bank Account Number -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.bankAccountNumber"
          label="Bank Account Number"
          placeholder="Enter account number"
          variant="outlined"
          prepend-inner-icon="mdi-bank-outline"
          :rules="bankAccountRules"
          type="tel"
          required
          density="comfortable"
        />
      </v-col>

      <!-- Bank Name -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.bankName"
          label="Bank Name"
          placeholder="Enter bank name"
          variant="outlined"
          prepend-inner-icon="mdi-bank-outline"
          :rules="bankNameRules"
          required
          density="comfortable"
        />
      </v-col>

      <!-- Bank IFSC Code -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.bankIfscCode"
          label="Bank IFSC Code"
          placeholder="e.g., SBIN0001234"
          variant="outlined"
          prepend-inner-icon="mdi-bank-outline"
          :rules="[
            (v) => !!v || 'IFSC code is required',
            (v) => v?.length >= 11 || 'Enter valid IFSC code',
          ]"
          required
          density="comfortable"
          @input="formData.bankIfscCode = formData.bankIfscCode.toUpperCase()"
        />
      </v-col>

      <!-- Bank Branch -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.bankBranch"
          label="Bank Branch"
          placeholder="Enter branch name"
          variant="outlined"
          prepend-inner-icon="mdi-bank-outline"
          density="comfortable"
        />
      </v-col>

      <!-- UPI ID (Optional) -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.upiId"
          label="UPI ID (Optional)"
          placeholder="yourname@upi"
          variant="outlined"
          prepend-inner-icon="mdi-cash-multiple"
          density="comfortable"
        />
      </v-col>

      <!-- GSTIN (Optional) -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formData.gstin"
          label="GSTIN (Optional)"
          placeholder="22AAAAA0000A1Z5"
          variant="outlined"
          prepend-inner-icon="mdi-file-document-outline"
          density="comfortable"
          maxlength="15"
          @input="formData.gstin = formData.gstin.toUpperCase()"
        />
      </v-col>

      <!-- Upload Passbook Photo -->
      <v-col cols="12">
        <v-card variant="outlined" class="pa-4">
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            Upload Passbook Photo
            <v-chip
              v-if="formData.passbookPhotoFile"
              color="success"
              size="x-small"
              class="ml-2"
            >
              <v-icon icon="mdi-check" start size="14" />
              Uploaded
            </v-chip>
          </h4>

          <div v-if="formData.passbookPreview" class="mb-3">
            <v-img
              :src="formData.passbookPreview"
              height="150"
              max-width="300"
              cover
              class="rounded mx-auto"
            />
            <p class="text-caption text-center mt-2">
              {{ formatFileSize(formData.passbookPhotoFile?.size) }}
            </p>
          </div>

          <input
            ref="passbookFileInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            hidden
            @change="(e) => handleFileSelect(e, 'passbook')"
          />

          <v-btn
            block
            variant="outlined"
            color="primary"
            prepend-icon="mdi-upload"
            :loading="uploading.passbook"
            @click="passbookFileInput?.click()"
          >
            {{ formData.passbookPhotoFile ? "Change" : "Upload" }}
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.onboarding-step {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

@media (max-width: 600px) {
  .onboarding-step {
    padding: 16px 8px;
  }
}
</style>
