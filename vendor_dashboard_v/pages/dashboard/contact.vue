<!-- File: pages/dashboard/contact.vue -->
<script setup>
    definePageMeta({
      layout: 'dashboard',
      middleware: ['auth-global-client']
    })
    </script>
    
    <template>
      <div>
        <v-card elevation="2">
          <v-card-title class="text-h5 pa-4">
            Contact Us
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <v-row>
              <v-col cols="12" md="6">
                <v-card variant="tonal" color="primary">
                  <v-card-text class="pa-4">
                    <div class="d-flex align-center mb-3">
                      <v-icon size="32" class="mr-3">mdi-email</v-icon>
                      <div>
                        <div class="text-subtitle-2 text-medium-emphasis">Email</div>
                        <div class="text-h6">support@neotrips.com</div>
                      </div>
                    </div>
                    <v-btn color="primary" variant="flat" block href="mailto:support@neotrips.com">
                      Send Email
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
    
              <v-col cols="12" md="6">
                <v-card variant="tonal" color="success">
                  <v-card-text class="pa-4">
                    <div class="d-flex align-center mb-3">
                      <v-icon size="32" class="mr-3">mdi-phone</v-icon>
                      <div>
                        <div class="text-subtitle-2 text-medium-emphasis">Phone</div>
                        <div class="text-h6">+91 98765 43210</div>
                      </div>
                    </div>
                    <v-btn color="success" variant="flat" block href="tel:+919876543210">
                      Call Now
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
    
            <v-card variant="outlined" class="mt-4">
              <v-card-text class="pa-4">
                <h3 class="text-h6 mb-3">Business Hours</h3>
                <v-list density="compact">
                  <v-list-item>
                    <template #prepend>
                      <v-icon>mdi-clock-outline</v-icon>
                    </template>
                    <v-list-item-title>Monday - Friday: 9:00 AM - 6:00 PM</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-icon>mdi-clock-outline</v-icon>
                    </template>
                    <v-list-item-title>Saturday: 10:00 AM - 4:00 PM</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-icon>mdi-close-circle-outline</v-icon>
                    </template>
                    <v-list-item-title>Sunday: Closed</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-card>
      </div>
    </template>