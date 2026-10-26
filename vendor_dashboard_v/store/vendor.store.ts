// store/vendor.ts
import { defineStore } from 'pinia';
import { useSupabase } from '~/composables/useSupabase';

export const useVendorStore = defineStore('vendor', {
  state: () => ({
    vendor: null as any,
    loading: false,
  }),

  getters: {
    isVendorLoaded: (state): boolean => !!state.vendor,
    vendorName: (state): string => state.vendor?.name || '',
  },

  actions: {
    async fetchVendorData() {
      this.loading = true;
      try {
        const supabase = useSupabase();
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return;

        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        this.vendor = data;
      }
      catch (error) {
        console.error('Error fetching vendor data:', error);
      }
      finally {
        this.loading = false;
      }
    },

    clearVendor() {
      this.vendor = null;
    },

    async saveStep1Data(data: any) {
      this.loading = true
      try {
        const supabase = useSupabase()
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('User not authenticated')
    
        const vendorId = await this.getOrCreateVendorId()
    
        // Update vendor with step 1 data
        const { error } = await supabase
          .from('vendors')
          .update({
            name: data.fullName,
            phone: data.phoneNumber, // was data.phone
            company_name: data.companyName,
            onboarding_step: 1
          })
          .eq('id', vendorId)
    
        if (error) throw error
    
        // Save activities
        // First delete existing
        await supabase
          .from('vendor_activities')
          .delete()
          .eq('vendor_id', vendorId)
    
        // Get activity IDs from activities_master table
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities_master')
          .select('id, name')
          .in('name', data.selectedActivities)
    
        if (activitiesError) throw activitiesError
    
        // Insert new with activity_id (correct column)
        const activityInserts = activitiesData.map((activity: any) => ({
          vendor_id: vendorId,
          activity_id: activity.id // Correct column name
        }))
    
        if (activityInserts.length > 0) {
          const { error: insertError } = await supabase
            .from('vendor_activities')
            .insert(activityInserts)
          
          if (insertError) throw insertError
        }
    
        return { success: true }
      } catch (error) {
        console.error('Error saving step 1:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async saveStep2Data(data: any) {
      this.loading = true
      try {
        const supabase = useSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) throw new Error('User not authenticated')

        const vendorId = await this.getOrCreateVendorId()
        const userId = user.id

        // Update vendor with step 2 data
        const { error: vendorError } = await supabase
          .from('vendors')
          .update({
            pan_number: data.panNumber,
            bank_account_number: data.bankAccountNumber,
            bank_name: data.bankName,
            bank_branch: data.bankBranch,
            bank_ifsc_code: data.bankIfscCode,
            upi_id: data.upiId,
            gstin: data.gstin,
            onboarding_step: 2
          })
          .eq('id', vendorId)

        if (vendorError) throw vendorError

        // Upload documents
        const timestamp = Date.now()
        const docs = [
          { file: data.panCardFile, type: 'pan_card', name: 'pan_card' },
          { file: data.aadhaarCardFile, type: 'aadhaar_card', name: 'aadhaar_card' },
          { file: data.passbookPhotoFile, type: 'passbook', name: 'passbook' }
        ]

        for (const doc of docs) {
          if (!doc.file) continue

          const path = `${userId}/${doc.name}_${timestamp}.${doc.file.name.split('.').pop()}`
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('vendor-documents')
            .upload(path, doc.file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          // Save to vendor_documents table
          await supabase.from('vendor_documents').insert({
            vendor_id: vendorId,
            document_category: 'vendor_kyc',
            document_type: doc.type,
            file_url: path,
            file_name: doc.file.name,
            file_size: doc.file.size
          })
        }

        return { success: true }
      } catch (error) {
        console.error('Error saving step 2:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async saveStep3Data(data: any) {
      this.loading = true
      console.log('💾 Store: saveStep3Data called with:', data)
      
      try {
        const supabase = useSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) throw new Error('User not authenticated')
        console.log('🔍 Store: User authenticated:', user.id)
    
        const vendorId = await this.getOrCreateVendorId()
        console.log('🔍 Store: Vendor ID:', vendorId)
    
        const userId = user.id
        const timestamp = Date.now()
    
        // Upload certificates
        console.log('💾 Store: Uploading certificates...')
        for (const [certName, certData] of Object.entries(data.certificates as Record<string, { file: File }>)) {
          if (!certData.file) {
            console.log(`   ⏭️  Skipping ${certName} (no file)`)
            continue
          }
    
          const path = `${userId}/cert_${certName.replace(/\s/g, '_')}_${timestamp}.${certData.file.name.split('.').pop()}`
          console.log(`   📤 Uploading ${certName} to ${path}`)
          
          const { error: uploadError } = await supabase.storage
            .from('vendor-documents')
            .upload(path, certData.file)
    
          if (uploadError) {
            console.error(`   ❌ Upload failed for ${certName}:`, uploadError)
            throw uploadError
          }
          console.log(`   ✅ Uploaded ${certName}`)
    
          await supabase.from('vendor_documents').insert({
            vendor_id: vendorId,
            document_category: 'activity_license',
            document_type: certName,
            file_url: path,
            file_name: certData.file.name,
            file_size: certData.file.size
          })
          console.log(`   ✅ Saved ${certName} to database`)
        }
    
        // Upload custom documents
        console.log('💾 Store: Uploading custom documents...')
        for (const doc of data.customDocuments) {
          if (!doc.file) {
            console.log('   ⏭️  Skipping custom doc (no file)')
            continue
          }
    
          const path = `${userId}/custom_${doc.title.replace(/\s/g, '_')}_${timestamp}.${doc.file.name.split('.').pop()}`
          console.log(`   📤 Uploading custom doc: ${doc.title}`)
          
          const { error: uploadError } = await supabase.storage
            .from('vendor-documents')
            .upload(path, doc.file)
    
          if (uploadError) {
            console.error(`   ❌ Upload failed for ${doc.title}:`, uploadError)
            throw uploadError
          }
          console.log(`   ✅ Uploaded ${doc.title}`)
    
          await supabase.from('vendor_documents').insert({
            vendor_id: vendorId,
            document_category: 'activity_license',
            document_type: 'custom',
            custom_document_name: doc.title,
            file_url: path,
            file_name: doc.file.name,
            file_size: doc.file.size
          })
          console.log(`   ✅ Saved ${doc.title} to database`)
        }
    
        // Mark onboarding complete
        console.log('💾 Store: Marking onboarding as COMPLETE...')
        const { error: updateError } = await supabase
          .from('vendors')
          .update({
            onboarding_completed: true,
            onboarding_step: 3
          })
          .eq('id', vendorId)
    
        if (updateError) {
          console.error('❌ Store: Failed to mark onboarding complete:', updateError)
          throw updateError
        }
        console.log('✅ Store: Onboarding marked COMPLETE')
    
        return { success: true }
      } catch (error) {
        console.error('❌ Store: Error saving step 3:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async getOrCreateVendorId(): Promise<string> {
      const supabase = useSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data?.id
    }
  },
});
