<script setup>
    definePageMeta({
      layout: 'dashboard',
      middleware: ['auth-global-client']
    })
    </script>
    
    <template>
      <div>
        <h1 class="text-h4 font-weight-bold mb-4">Bookings</h1>
        <p>Your bookings will appear here.</p>
      </div>
    </template>