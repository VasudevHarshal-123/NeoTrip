<!-- components/TermsConditionsModal.vue -->
<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue', 'accept']);

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const handleAccept = () => {
  emit('accept');
  dialog.value = false;
};

const handleClose = () => {
  dialog.value = false;
};
</script>

<template>
  <v-dialog
    v-model="dialog"
    max-width="800"
    scrollable
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between bg-primary pa-4">
        <div class="d-flex align-center">
          <v-icon class="mr-2" color="white">mdi-file-document-outline</v-icon>
          <span class="text-h6 text-white">Terms and Conditions</span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="handleClose"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6" style="max-height: 500px; overflow-y: auto;">
        <div class="terms-content">
          <h3 class="text-h6 mb-3">1. Acceptance of Terms</h3>
          <p class="mb-4">
            By accessing and using NeoTrips vendor platform, you accept and agree to be bound by the terms 
            and provision of this agreement. If you do not agree to abide by the above, please do not use 
            this service.
          </p>

          <h3 class="text-h6 mb-3">2. Use of Services</h3>
          <p class="mb-4">
            You agree to use the NeoTrips platform only for lawful purposes. You are prohibited from posting 
            or transmitting any unlawful, threatening, defamatory, libelous, obscene, pornographic or profane 
            material or any material that could constitute or encourage conduct that would be considered a 
            criminal offense or give rise to civil liability.
          </p>

          <h3 class="text-h6 mb-3">3. Vendor Responsibilities</h3>
          <p class="mb-4">
            As a vendor on NeoTrips platform, you agree to:
          </p>
          <ul class="mb-4 ml-4">
            <li>Provide accurate and truthful information about your services</li>
            <li>Maintain valid licenses and certifications required for your activities</li>
            <li>Ensure the safety and quality of services offered to customers</li>
            <li>Respond promptly to customer inquiries and bookings</li>
            <li>Honor all confirmed bookings and commitments</li>
            <li>Comply with all applicable local, state, and national laws and regulations</li>
          </ul>

          <h3 class="text-h6 mb-3">4. Account Security</h3>
          <p class="mb-4">
            You are responsible for maintaining the confidentiality of your account credentials and for all 
            activities that occur under your account. You agree to notify NeoTrips immediately of any 
            unauthorized use of your account.
          </p>

          <h3 class="text-h6 mb-3">5. Document Verification</h3>
          <p class="mb-4">
            All vendors must submit valid identification and business documents including but not limited to:
            PAN Card, Aadhaar Card, Bank Passbook, and Activity Licenses. NeoTrips reserves the right to 
            verify all submitted documents and may request additional documentation as needed.
          </p>

          <h3 class="text-h6 mb-3">6. Payment Terms</h3>
          <p class="mb-4">
            NeoTrips will process payments according to the agreed payment schedule. Commission rates and 
            payment terms will be communicated separately. Vendors are responsible for all applicable taxes 
            on their earnings.
          </p>

          <h3 class="text-h6 mb-3">7. Cancellation and Refund Policy</h3>
          <p class="mb-4">
            Vendors must adhere to the cancellation and refund policies as outlined in their service agreements. 
            Failure to comply may result in penalties or account suspension.
          </p>

          <h3 class="text-h6 mb-3">8. Intellectual Property</h3>
          <p class="mb-4">
            All content on the NeoTrips platform, including logos, text, images, and software, is the property 
            of NeoTrips or its licensors and is protected by copyright and other intellectual property laws.
          </p>

          <h3 class="text-h6 mb-3">9. Limitation of Liability</h3>
          <p class="mb-4">
            NeoTrips shall not be liable for any indirect, incidental, special, consequential or punitive damages 
            resulting from your use of or inability to use the service. This includes damages for loss of profits, 
            goodwill, use, data or other intangible losses.
          </p>

          <h3 class="text-h6 mb-3">10. Indemnification</h3>
          <p class="mb-4">
            You agree to indemnify and hold NeoTrips, its affiliates, officers, agents, and employees harmless 
            from any claim or demand, including reasonable attorneys' fees, made by any third party due to or 
            arising out of your use of the service, your violation of these Terms, or your violation of any 
            rights of another.
          </p>

          <h3 class="text-h6 mb-3">11. Termination</h3>
          <p class="mb-4">
            NeoTrips reserves the right to terminate or suspend your account at any time for violations of these 
            terms or for any other reason deemed necessary. Upon termination, your right to use the service will 
            immediately cease.
          </p>

          <h3 class="text-h6 mb-3">12. Privacy Policy</h3>
          <p class="mb-4">
            Your use of NeoTrips is also governed by our Privacy Policy. Please review our Privacy Policy, which 
            also governs the site and informs users of our data collection practices.
          </p>

          <h3 class="text-h6 mb-3">13. Changes to Terms</h3>
          <p class="mb-4">
            NeoTrips reserves the right to modify these terms at any time. We will notify vendors of any material 
            changes via email or through the platform. Your continued use of the service after such modifications 
            constitutes your acceptance of the updated terms.
          </p>

          <h3 class="text-h6 mb-3">14. Governing Law</h3>
          <p class="mb-4">
            These terms shall be governed by and construed in accordance with the laws of India, without regard 
            to its conflict of law provisions.
          </p>

          <h3 class="text-h6 mb-3">15. Contact Information</h3>
          <p class="mb-4">
            If you have any questions about these Terms and Conditions, please contact us at:
            <br>
            Email: support@neotrips.com
            <br>
            Phone: +91-1800-XXX-XXXX
          </p>

          <p class="text-caption text-medium-emphasis mt-6">
            Last Updated: December 2025
          </p>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          color="grey"
          @click="handleClose"
        >
          Close
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="handleAccept"
        >
          I Accept
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.terms-content {
  line-height: 1.6;
}

.terms-content h3 {
  color: rgb(var(--v-theme-primary));
  margin-top: 1rem;
}

.terms-content p {
  color: rgba(0, 0, 0, 0.87);
}

.terms-content ul {
  list-style-type: disc;
}

.terms-content li {
  margin-bottom: 0.5rem;
}
</style>