<!-- 
  File: components/onboarding/OnboardingStep3.vue
  Path: components/onboarding/OnboardingStep3.vue
  Description: Step 3 - Upload Certifications (DYNAMIC based on selected activities)
-->

<script setup>
  import { ref, computed, watch } from 'vue'
  import { processImageFile, formatFileSize } from '~/utils/imageCompression'
  import { getCertificatesForActivities } from '~/constants/certificates'
  
  // Props
  const props = defineProps({
    modelValue: {
      type: Object,
      default: () => ({
        certificates: {}, // { certName: { file, preview, type: 'mandatory'|'optional' } }
        customDocuments: []
      })
    },
    selectedActivities: {
      type: Array,
      default: () => []
    }
  })
  
  // Emits
  const emit = defineEmits(['update:modelValue'])
  
  // Local state
  const formData = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  
  const uploading = ref({})
  
  // Required certificates based on selected activities
  const requiredCertificates = computed(() => {
    return getCertificatesForActivities(props.selectedActivities)
  })
  
  // Initialize certificates structure when activities change
  watch(() => props.selectedActivities, (newActivities) => {
    const certs = getCertificatesForActivities(newActivities)
    const certificatesObj = {}
    
    Object.entries(certs).forEach(([certName, type]) => {
      // Keep existing file if already uploaded
      const existingCert = formData.value.certificates?.[certName]
      certificatesObj[certName] = {
        file: existingCert?.file || null,
        preview: existingCert?.preview || null,
        type: type
      }
    })
    
    formData.value.certificates = certificatesObj
  }, { immediate: true })
  
  // Handle certificate upload
  const handleCertUpload = async (event, certName) => {
    const file = event.target.files?.[0]
    if (!file) return
  
    try {
      uploading.value[certName] = true
      const result = await processImageFile(file, 500)
  
      const reader = new FileReader()
      reader.onload = (e) => {
        formData.value.certificates[certName].preview = e.target.result
      }
      reader.readAsDataURL(result.file)
  
      formData.value.certificates[certName].file = result.file
    } catch (error) {
      console.error(`Error processing ${certName}:`, error)
      alert('Failed to process image. Please try again.')
    } finally {
      uploading.value[certName] = false
    }
  }
  
  // Custom documents
  const addCustomDocument = () => {
    formData.value.customDocuments.push({
      title: '',
      file: null,
      preview: null
    })
  }
  
  const removeCustomDocument = (index) => {
    formData.value.customDocuments.splice(index, 1)
  }
  
  const handleCustomDocUpload = async (event, index) => {
    const file = event.target.files?.[0]
    if (!file) return
  
    try {
      uploading.value[`custom_${index}`] = true
      const result = await processImageFile(file, 500)
  
      const reader = new FileReader()
      reader.onload = (e) => {
        formData.value.customDocuments[index].preview = e.target.result
      }
      reader.readAsDataURL(result.file)
  
      formData.value.customDocuments[index].file = result.file
    } catch (error) {
      console.error('Error processing custom document:', error)
      alert('Failed to process image. Please try again.')
    } finally {
      uploading.value[`custom_${index}`] = false
    }
  }
  
  // Validation - only mandatory certs required
  const isValid = computed(() => {
    // Check all mandatory certificates are uploaded
    const mandatoryCerts = Object.entries(formData.value.certificates || {})
      .filter(([_, cert]) => cert.type === 'mandatory')
    
    const allMandatoryUploaded = mandatoryCerts.every(([_, cert]) => cert.file !== null)
    
    // Check custom docs have title and file
    const customDocsValid = formData.value.customDocuments.every(
      doc => doc.title?.trim() && doc.file
    )
    
    return allMandatoryUploaded && customDocsValid
  })
  
  defineExpose({ isValid })
  </script>
  
  <template>
    <div class="onboarding-step">
      <!-- Header -->
      <div class="mb-8 text-center">
        <h2 class="text-h4 font-weight-bold mb-2">Upload Certifications</h2>
        <p class="text-body-1 text-medium-emphasis">
          Upload your activity-specific certificates.
        </p>
      </div>
  
      <!-- Required Certifications (DYNAMIC) -->
      <div class="mb-6">
        <h3 class="text-h6 font-weight-medium mb-4">Required Certifications</h3>
  
        <!-- No activities selected -->
        <v-alert 
          v-if="Object.keys(requiredCertificates).length === 0" 
          type="info" 
          variant="tonal" 
          class="mb-4"
        >
          No certificates required. Please select activities in Step 1.
        </v-alert>
  
        <!-- Dynamic certificate cards -->
        <v-row v-else>
          <v-col 
            v-for="(type, certName) in requiredCertificates" 
            :key="certName"
            cols="12" 
            md="6"
          >
            <v-card variant="outlined" class="pa-4">
              <!-- Certificate Title with Mandatory/Optional Badge -->
              <h4 class="text-subtitle-1 font-weight-medium mb-3">
                {{ certName }}
                
                <!-- Mandatory/Optional Badge -->
                <v-chip
                  :color="type === 'mandatory' ? 'error' : 'grey'"
                  size="x-small"
                  class="ml-2"
                  variant="flat"
                >
                  {{ type.toUpperCase() }}
                </v-chip>
                
                <!-- Uploaded Badge -->
                <v-chip
                  v-if="formData.certificates[certName]?.file"
                  color="success"
                  size="x-small"
                  class="ml-2"
                >
                  <v-icon icon="mdi-check" start size="14" />
                  Uploaded
                </v-chip>
              </h4>
  
              <!-- Image Preview -->
              <div v-if="formData.certificates[certName]?.preview" class="mb-3">
                <v-img
                  :src="formData.certificates[certName].preview"
                  height="150"
                  cover
                  class="rounded"
                />
                <p class="text-caption text-center mt-2">
                  {{ formatFileSize(formData.certificates[certName].file?.size) }}
                </p>
              </div>
  
              <!-- Hidden File Input -->
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                hidden
                :ref="`cert_${certName}`"
                @change="(e) => handleCertUpload(e, certName)"
              />
  
              <!-- Upload Button -->
              <v-btn
                block
                variant="outlined"
                color="primary"
                prepend-icon="mdi-upload"
                :loading="uploading[certName]"
                @click="$refs[`cert_${certName}`]?.[0]?.click()"
              >
                {{ formData.certificates[certName]?.file ? 'Change' : 'Upload File' }}
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </div>
  
      <!-- Additional Documents (Custom) -->
      <div>
        <div class="d-flex align-center justify-space-between mb-4">
          <h3 class="text-h6 font-weight-medium">Additional Documents</h3>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus-circle-outline"
            variant="outlined"
            size="small"
            @click="addCustomDocument"
          >
            Add Custom Document
          </v-btn>
        </div>
  
        <!-- Empty State -->
        <v-card
          v-if="formData.customDocuments.length === 0"
          variant="outlined"
          class="pa-8 text-center"
        >
          <v-icon icon="mdi-file-document-plus-outline" size="48" color="grey" class="mb-2" />
          <p class="text-body-2 text-medium-emphasis">
            No additional documents added yet.
          </p>
          <p class="text-caption text-medium-emphasis">
            Click "Add Custom Document" to upload more certificates.
          </p>
        </v-card>
  
        <!-- Custom Documents List -->
        <v-row v-else>
          <v-col
            v-for="(doc, index) in formData.customDocuments"
            :key="index"
            cols="12"
          >
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex align-start gap-4">
                <!-- Document Title & Upload -->
                <div style="flex: 1;">
                  <v-text-field
                    v-model="doc.title"
                    label="Document Title"
                    placeholder="e.g., Safety Certificate, Insurance"
                    variant="outlined"
                    density="compact"
                    class="mb-3"
                    :rules="[v => !!v || 'Document title is required']"
                  />
  
                  <div v-if="doc.preview" class="mb-3">
                    <v-img
                      :src="doc.preview"
                      height="120"
                      max-width="200"
                      cover
                      class="rounded"
                    />
                    <p class="text-caption mt-1">
                      {{ formatFileSize(doc.file?.size) }}
                    </p>
                  </div>
  
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    hidden
                    :ref="`customDocInput${index}`"
                    @change="(e) => handleCustomDocUpload(e, index)"
                  />
  
                  <v-btn
                    variant="outlined"
                    color="primary"
                    size="small"
                    prepend-icon="mdi-upload"
                    :loading="uploading[`custom_${index}`]"
                    @click="$refs[`customDocInput${index}`]?.[0]?.click()"
                  >
                    {{ doc.file ? 'Change File' : 'Upload File' }}
                  </v-btn>
                </div>
  
                <!-- Remove Button -->
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  color="error"
                  @click="removeCustomDocument(index)"
                />
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>
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