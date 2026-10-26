<!-- File: components/activity/ActivityMediaLocation.vue -->
<script setup>
    import { ref, computed } from 'vue'
    
    const props = defineProps({
      modelValue: {
        type: Object,
        required: true
      }
    })
    
    const emit = defineEmits(['update:modelValue'])
    
    const formData = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })
    
    // Indian states
    const indianStates = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ]
    
    // Image upload
    const fileInput = ref(null)
    const dragOver = ref(false)
    
    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files || event.dataTransfer.files)
      processFiles(files)
    }
    
    const processFiles = (files) => {
      if (formData.value.images.length + files.length > 10) {
        alert('Maximum 10 images allowed')
        return
      }
    
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']

      files.forEach(file => {
        // Check if file type is allowed
        if (!allowedTypes.includes(file.type)) {
          alert(`${file.name} is not supported. Only JPG and PNG images are allowed.`)
          return
        }
    
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} exceeds 5MB limit`)
          return
        }
    
        const reader = new FileReader()
        reader.onload = (e) => {
          formData.value.images.push({
            file,
            preview: e.target.result,
            uploaded: false,
            url: ''
          })
        }
        reader.readAsDataURL(file)
      })
    }
    
    const removeImage = (index) => {
      formData.value.images.splice(index, 1)
    }
    
    const triggerFileInput = () => {
      fileInput.value?.click()
    }
    
    // Pickup points
    const addPickupPoint = () => {
      formData.value.pickupPoints.push({ name: '', address: '' })
    }
    
    const removePickupPoint = (index) => {
      formData.value.pickupPoints.splice(index, 1)
    }
    
    // Inclusions/Exclusions chips
    const inclusionInput = ref('')
    const exclusionInput = ref('')
    
    const addInclusion = () => {
      if (inclusionInput.value.trim()) {
        formData.value.inclusions.push(inclusionInput.value.trim())
        inclusionInput.value = ''
      }
    }
    
    const removeInclusion = (index) => {
      formData.value.inclusions.splice(index, 1)
    }
    
    const addExclusion = () => {
      if (exclusionInput.value.trim()) {
        formData.value.exclusions.push(exclusionInput.value.trim())
        exclusionInput.value = ''
      }
    }
    
    const removeExclusion = (index) => {
      formData.value.exclusions.splice(index, 1)
    }
    
    // Common requirements
    const commonRequirements = [
      { key: 'fitness', label: 'Good Physical Fitness Required' },
      { key: 'swimming', label: 'Swimming Ability Required' },
      { key: 'noHeights', label: 'No Fear of Heights' }
    ]
    
    // Validation
    const isValid = computed(() => {
      return !!(
        formData.value.images.length >= 1 &&
        formData.value.city &&
        formData.value.state
      )
    })
    
    defineExpose({ isValid })
    </script>
    
    <template>
      <div class="activity-media-location">
        <h2 class="text-h5 font-weight-bold mb-4">Media, Location & Details</h2>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Add images and location details to complete your listing
        </p>
    
        <!-- Image Upload -->
        <div class="mb-6">
          <div class="text-subtitle-2 font-weight-medium mb-3">
            Activity Images * ({{ formData.images.length }}/10)
          </div>
    
          <!-- Upload Zone -->
          <v-card
            variant="outlined"
            :class="['upload-zone pa-6 mb-4', { 'drag-over': dragOver }]"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="handleFileSelect"
            @click="triggerFileInput"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              multiple
              style="display: none"
              @change="handleFileSelect"
            >
    
            <div class="text-center">
              <v-icon size="48" color="primary" class="mb-3">mdi-cloud-upload</v-icon>
              <div class="text-h6 mb-2">Drop images here or click to browse</div>
              <div class="text-caption text-medium-emphasis">
                PNG, JPG up to 5MB • Min 1, Max 10 images
              </div>
            </div>
          </v-card>
    
          <!-- Image Preview Grid -->
          <v-row v-if="formData.images.length > 0">
            <v-col
              v-for="(img, index) in formData.images"
              :key="index"
              cols="6"
              md="3"
            >
              <v-card elevation="2">
                <v-img
                  :src="img.preview"
                  aspect-ratio="1"
                  cover
                >
                  <v-btn
                    icon="mdi-close"
                    size="small"
                    color="error"
                    class="ma-2"
                    style="position: absolute; top: 0; right: 0;"
                    @click.stop="removeImage(index)"
                  />
                  <v-chip
                    v-if="index === 0"
                    color="primary"
                    size="small"
                    class="ma-2"
                    style="position: absolute; bottom: 0; left: 0;"
                  >
                    Cover
                  </v-chip>
                </v-img>
              </v-card>
            </v-col>
          </v-row>
    
          <v-alert v-if="formData.images.length === 0" type="warning" variant="tonal" class="mt-2">
            Please upload at least 1 image
          </v-alert>
        </div>
    
        <v-divider class="my-6" />
    
        <!-- Location -->
        <div class="mb-6">
          <div class="text-subtitle-2 font-weight-medium mb-3">Location</div>
    
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.city"
                label="City *"
                variant="outlined"
                prepend-inner-icon="mdi-city"
                :rules="[v => !!v || 'City is required']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.state"
                :items="indianStates"
                label="State *"
                variant="outlined"
                prepend-inner-icon="mdi-map-marker"
                :rules="[v => !!v || 'State is required']"
              />
            </v-col>
          </v-row>
        </div>
    
        <!-- Pickup Points -->
        <div class="mb-6">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-2 font-weight-medium">Pickup Points (Optional)</div>
            <v-btn
              size="small"
              variant="outlined"
              prepend-icon="mdi-plus"
              @click="addPickupPoint"
            >
              Add Point
            </v-btn>
          </div>
    
          <v-card v-if="formData.pickupPoints.length > 0" variant="outlined" class="pa-4">
            <div
              v-for="(point, index) in formData.pickupPoints"
              :key="index"
              class="mb-3"
            >
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="point.name"
                    label="Point Name"
                    variant="outlined"
                    density="compact"
                    placeholder="e.g., City Center"
                  />
                </v-col>
                <v-col cols="12" md="7">
                  <v-text-field
                    v-model="point.address"
                    label="Address"
                    variant="outlined"
                    density="compact"
                    placeholder="Complete address"
                  />
                </v-col>
                <v-col cols="12" md="1" class="d-flex align-center">
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click="removePickupPoint(index)"
                  />
                </v-col>
              </v-row>
            </div>
          </v-card>
        </div>
    
        <v-divider class="my-6" />
    
        <!-- Inclusions -->
        <div class="mb-6">
          <div class="text-subtitle-2 font-weight-medium mb-3">What's Included</div>
          
          <v-text-field
            v-model="inclusionInput"
            label="Add Inclusion"
            variant="outlined"
            placeholder="e.g., Equipment, Guide, Meals"
            append-inner-icon="mdi-plus-circle"
            @click:append-inner="addInclusion"
            @keyup.enter="addInclusion"
          />
    
          <v-chip-group v-if="formData.inclusions.length > 0" column class="mt-2">
            <v-chip
              v-for="(item, index) in formData.inclusions"
              :key="index"
              closable
              color="success"
              @click:close="removeInclusion(index)"
            >
              <v-icon start>mdi-check-circle</v-icon>
              {{ item }}
            </v-chip>
          </v-chip-group>
        </div>
    
        <!-- Exclusions -->
        <div class="mb-6">
          <div class="text-subtitle-2 font-weight-medium mb-3">What's Not Included</div>
          
          <v-text-field
            v-model="exclusionInput"
            label="Add Exclusion"
            variant="outlined"
            placeholder="e.g., Transport, Insurance, Personal expenses"
            append-inner-icon="mdi-plus-circle"
            @click:append-inner="addExclusion"
            @keyup.enter="addExclusion"
          />
    
          <v-chip-group v-if="formData.exclusions.length > 0" column class="mt-2">
            <v-chip
              v-for="(item, index) in formData.exclusions"
              :key="index"
              closable
              color="error"
              @click:close="removeExclusion(index)"
            >
              <v-icon start>mdi-close-circle</v-icon>
              {{ item }}
            </v-chip>
          </v-chip-group>
        </div>
    
        <v-divider class="my-6" />
    
        <!-- Requirements -->
        <div class="mb-6">
          <div class="text-subtitle-2 font-weight-medium mb-3">Participant Requirements</div>
    
          <v-checkbox
            v-for="req in commonRequirements"
            :key="req.key"
            v-model="formData.requirements[req.key]"
            :label="req.label"
            density="compact"
            hide-details
          />
    
          <v-textarea
            v-model="formData.requirements.other"
            label="Other Requirements (Optional)"
            variant="outlined"
            placeholder="Any additional requirements..."
            rows="3"
            class="mt-3"
          />
        </div>
    
        <!-- Waiver Info -->
        <v-card variant="tonal" color="warning" class="pa-4">
          <div class="d-flex align-start">
            <v-icon size="24" class="mr-3">mdi-file-document</v-icon>
            <div>
              <div class="text-subtitle-2 font-weight-medium mb-1">Safety Waiver</div>
              <div class="text-caption">
                A standard safety waiver will be automatically applied to this activity. 
                All participants must accept the waiver before booking.
              </div>
            </div>
          </div>
        </v-card>
      </div>
    </template>
    
    <style scoped>
    .activity-media-location {
      max-width: 900px;
      margin: 0 auto;
    }
    
    .upload-zone {
      cursor: pointer;
      border: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));
      transition: all 0.3s ease;
    }
    
    .upload-zone:hover,
    .upload-zone.drag-over {
      border-color: rgb(var(--v-theme-primary));
      background-color: rgba(var(--v-theme-primary), 0.05);
    }
    </style>
    