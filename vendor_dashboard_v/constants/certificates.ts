// File: constants/certificates.ts
// Path: constants/certificates.ts
// Description: Complete activity-specific certificate requirements

export const REQUIRED_CERTIFICATES: Record<string, Record<string, 'mandatory' | 'optional'>> = {
    // =====================================================
    // ADVENTURE SPORTS - AIR
    // =====================================================
    'Paragliding': {
      'Paragliding Pilot License': 'mandatory',
      'First Aid Certificate': 'mandatory',
      'Insurance Certificate': 'mandatory'
    },
    'Parasailing': {
      'Parasailing Operator License': 'mandatory',
      'First Aid Certificate': 'mandatory',
      'Equipment Safety Certificate': 'mandatory'
    },
    'Hot Air Ballooning': {
      'Balloon Pilot License': 'mandatory',
      'First Aid Certificate': 'mandatory',
      'Insurance Certificate': 'mandatory'
    },
    'Skydiving': {
      'Skydiving Instructor License': 'mandatory',
      'USPA/BPA Certification': 'mandatory',
      'First Aid Certificate': 'mandatory',
      'Insurance Certificate': 'mandatory'
    },
    'Bungee Jumping': {
      'Bungee Operator License': 'mandatory',
      'Equipment Safety Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Zip Lining': {
      'Zip Line Operator License': 'mandatory',
      'Safety Inspector Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Hang Gliding': {
      'Hang Gliding Pilot License': 'mandatory',
      'First Aid Certificate': 'mandatory',
      'Insurance Certificate': 'optional'
    },
    'Helicopter Tours': {
      'Commercial Pilot License': 'mandatory',
      'Air Operator Certificate': 'mandatory',
      'Insurance Certificate': 'mandatory'
    },
    'Microlight Flying': {
      'Microlight Pilot License': 'mandatory',
      'First Aid Certificate': 'mandatory',
      'Insurance Certificate': 'mandatory'
    },
  
    // =====================================================
    // ADVENTURE SPORTS - WATER
    // =====================================================
    'Scuba Diving': {
      'PADI/SSI Certification': 'mandatory',
      'Divemaster Certificate': 'optional',
      'First Aid Certificate': 'mandatory',
      'Rescue Diver Certificate': 'optional'
    },
    'Snorkeling': {
      'Snorkeling Guide Certificate': 'optional',
      'First Aid Certificate': 'mandatory',
      'Lifeguard Certificate': 'optional'
    },
    'Jet Skiing': {
      'Watercraft Operator License': 'mandatory',
      'Insurance Certificate': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Kayaking': {
      'Kayaking Instructor Certificate': 'mandatory',
      'Swift Water Rescue Certificate': 'optional',
      'First Aid Certificate': 'mandatory'
    },
    'White Water Rafting': {
      'Rafting Guide Certificate': 'mandatory',
      'Swift Water Rescue Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'River Rafting': {
      'Rafting Guide Certificate': 'mandatory',
      'Swift Water Rescue Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Canoeing': {
      'Canoeing Instructor Certificate': 'optional',
      'First Aid Certificate': 'mandatory'
    },
    'Surfing': {
      'Surfing Instructor Certificate': 'mandatory',
      'Lifeguard Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Wakeboarding': {
      'Wakeboard Instructor License': 'optional',
      'Boat Operator License': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Water Skiing': {
      'Water Ski Instructor Certificate': 'optional',
      'Boat Operator License': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Banana Boat Ride': {
      'Boat Operator License': 'mandatory',
      'Insurance Certificate': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Speed Boat Ride': {
      'Boat Operator License': 'mandatory',
      'Insurance Certificate': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Yacht Cruises': {
      'Yacht Master License': 'mandatory',
      'Marine Insurance': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Sailing': {
      'Sailing Instructor Certificate': 'optional',
      'Boat Operator License': 'mandatory'
    },
    'Paddleboarding': {
      'SUP Instructor Certificate': 'optional',
      'First Aid Certificate': 'optional'
    },
    'Flyboarding': {
      'Flyboard Instructor License': 'mandatory',
      'Insurance Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Underwater Sea Walking': {
      'Underwater Guide Certificate': 'mandatory',
      'Diving Medical Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Swimming': {
      'Swimming Instructor Certificate': 'optional',
      'Lifeguard Certificate': 'optional'
    },
    'Pool Activities': {
      'Lifeguard Certificate': 'optional',
      'First Aid Certificate': 'optional'
    },
  
    // =====================================================
    // ADVENTURE SPORTS - LAND
    // =====================================================
    'Rock Climbing': {
      'Climbing Instructor Certificate': 'mandatory',
      'Rope Rescue Certificate': 'optional',
      'First Aid Certificate': 'mandatory'
    },
    'Mountain Climbing': {
      'Mountaineering Guide Certificate': 'mandatory',
      'Wilderness First Aid': 'mandatory',
      'Avalanche Safety Certificate': 'optional'
    },
    'Mountaineering': {
      'Mountaineering Guide Certificate': 'mandatory',
      'Wilderness First Aid': 'mandatory',
      'High Altitude Medicine Certificate': 'optional'
    },
    'Trekking': {
      'Trek Leader Certificate': 'mandatory',
      'Wilderness First Aid': 'mandatory'
    },
    'Hiking': {
      'Hiking Guide Certificate': 'optional',
      'Wilderness First Aid': 'optional'
    },
    'Camping': {
      'Outdoor Leader Certificate': 'optional',
      'First Aid Certificate': 'mandatory'
    },
    'ATV Rides': {
      'ATV Instructor License': 'mandatory',
      'Vehicle Insurance': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Quad Biking': {
      'Quad Bike Instructor License': 'mandatory',
      'Vehicle Insurance': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Dirt Biking': {
      'Motorcycle License': 'mandatory',
      'Off-road Instructor Certificate': 'optional',
      'Insurance Certificate': 'mandatory'
    },
    'Mountain Biking': {
      'Mountain Bike Guide Certificate': 'optional',
      'First Aid Certificate': 'optional'
    },
    'Cycling Tours': {
      'Tour Guide License': 'optional',
      'First Aid Certificate': 'optional'
    },
    'Horse Riding': {
      'Equestrian Instructor Certificate': 'optional',
      'Horse Riding Guide License': 'optional',
      'First Aid Certificate': 'optional'
    },
    'Camel Safari': {
      'Safari Guide License': 'optional',
      'Tourism Permit': 'mandatory'
    },
    'Elephant Safari': {
      'Wildlife Guide License': 'mandatory',
      'Animal Welfare Certificate': 'mandatory',
      'Tourism Permit': 'mandatory'
    },
    'Wildlife Safari': {
      'Wildlife Guide License': 'mandatory',
      'First Aid Certificate': 'mandatory',
      'Tourism Permit': 'mandatory'
    },
    'Jeep Safari': {
      'Driver License': 'mandatory',
      'Tourism Permit': 'mandatory',
      'Vehicle Insurance': 'mandatory'
    },
    'Desert Safari': {
      'Safari Guide License': 'optional',
      'Driver License': 'mandatory',
      'Tourism Permit': 'mandatory'
    },
    'Dune Bashing': {
      'Off-road Driver License': 'mandatory',
      'Vehicle Insurance': 'mandatory',
      'Tourism Permit': 'mandatory'
    },
    'Sand Boarding': {
      'Sandboard Instructor Certificate': 'optional',
      'First Aid Certificate': 'optional'
    },
    'Rappelling': {
      'Rappelling Instructor Certificate': 'mandatory',
      'Rope Rescue Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Abseiling': {
      'Abseiling Instructor Certificate': 'mandatory',
      'Rope Rescue Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Cave Exploration': {
      'Cave Guide Certificate': 'mandatory',
      'Wilderness First Aid': 'mandatory',
      'Rescue Training Certificate': 'optional'
    },
    'Caving': {
      'Cave Guide Certificate': 'mandatory',
      'Wilderness First Aid': 'mandatory'
    },
    'Off-roading': {
      'Off-road Driver License': 'mandatory',
      'Vehicle Insurance': 'mandatory'
    },
    'Go Karting': {
      'Go Kart Track License': 'mandatory',
      'Insurance Certificate': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Paintball': {
      'Paintball Facility License': 'mandatory',
      'Safety Certificate': 'mandatory',
      'First Aid Certificate': 'optional'
    },
    'Zorbing': {
      'Zorbing Operator License': 'mandatory',
      'Equipment Safety Certificate': 'mandatory',
      'Insurance Certificate': 'mandatory'
    },
    'Archery': {
      'Archery Instructor Certificate': 'optional',
      'Range Safety Certificate': 'mandatory'
    },
    'Shooting Range': {
      'Firearms License': 'mandatory',
      'Range Safety Certificate': 'mandatory',
      'Insurance Certificate': 'mandatory'
    },
    'Rope Courses': {
      'Rope Course Instructor Certificate': 'mandatory',
      'Safety Inspector Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Obstacle Courses': {
      'Obstacle Course Instructor Certificate': 'optional',
      'Safety Certificate': 'mandatory',
      'First Aid Certificate': 'optional'
    },
  
    // =====================================================
    // SNOW & ICE ACTIVITIES
    // =====================================================
    'Skiing': {
      'Ski Instructor Certificate': 'mandatory',
      'Avalanche Safety Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Snowboarding': {
      'Snowboard Instructor Certificate': 'mandatory',
      'Avalanche Safety Certificate': 'mandatory',
      'First Aid Certificate': 'mandatory'
    },
    'Ice Skating': {
      'Skating Instructor Certificate': 'optional',
      'First Aid Certificate': 'optional'
    },
    'Snowmobiling': {
      'Snowmobile Operator License': 'mandatory',
      'Insurance Certificate': 'mandatory',
      'Avalanche Safety Certificate': 'optional'
    },
    'Dog Sledding': {
      'Dog Sledding Guide Certificate': 'optional',
      'Animal Welfare Certificate': 'optional',
      'First Aid Certificate': 'optional'
    },
    'Ice Climbing': {
      'Ice Climbing Instructor Certificate': 'mandatory',
      'Avalanche Safety Certificate': 'mandatory',
      'Wilderness First Aid': 'mandatory'
    },
    'Glacier Walking': {
      'Glacier Guide Certificate': 'mandatory',
      'Avalanche Safety Certificate': 'mandatory',
      'Wilderness First Aid': 'mandatory'
    },
  
    // =====================================================
    // NATURE & WILDLIFE
    // =====================================================
    'Bird Watching': {
      'Nature Guide Certificate': 'optional',
      'Bird Watching Guide License': 'optional'
    },
    'Wildlife Photography': {
      'Wildlife Guide License': 'optional',
      'Photography Tour License': 'optional'
    },
    'Nature Walks': {
      'Nature Guide Certificate': 'optional'
    },
    'Forest Bathing': {
      'Forest Therapy Guide Certificate': 'optional'
    },
    'Botanical Garden Tours': {
      'Tour Guide License': 'optional',
      'Botany Knowledge Certificate': 'optional'
    },
    'Zoo Visits': {
      'Tour Guide License': 'optional'
    },
    'Aquarium Visits': {
      'Tour Guide License': 'optional'
    },
    'Marine Park Visits': {
      'Tour Guide License': 'optional'
    },
    'National Park Tours': {
      'Wildlife Guide License': 'mandatory',
      'Tourism Permit': 'mandatory'
    },
    'Wildlife Sanctuary Tours': {
      'Wildlife Guide License': 'mandatory',
      'Tourism Permit': 'mandatory'
    },
    'Conservation Tours': {
      'Conservation Guide Certificate': 'optional',
      'Tourism Permit': 'optional'
    },
  
    // =====================================================
    // CULTURAL & HERITAGE
    // =====================================================
    'Heritage Walks': {
      'Heritage Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Historical Tours': {
      'Historical Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Museum Tours': {
      'Museum Guide Certificate': 'optional'
    },
    'Art Gallery Visits': {
      'Art Guide Certificate': 'optional'
    },
    'Cultural Shows': {
      'Event Organizer License': 'optional',
      'Business License': 'mandatory'
    },
    'Traditional Dance Performances': {
      'Event Organizer License': 'optional',
      'Business License': 'optional'
    },
    'Music Concerts': {
      'Event Organizer License': 'mandatory',
      'Sound Permit': 'mandatory',
      'Business License': 'mandatory'
    },
    'Theater Shows': {
      'Event Organizer License': 'optional',
      'Business License': 'optional'
    },
    'Temple Tours': {
      'Religious Tour Guide License': 'optional'
    },
    'Church Tours': {
      'Religious Tour Guide License': 'optional'
    },
    'Mosque Tours': {
      'Religious Tour Guide License': 'optional'
    },
    'Monastery Visits': {
      'Religious Tour Guide License': 'optional'
    },
    'Palace Tours': {
      'Heritage Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Fort Tours': {
      'Heritage Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Archaeological Site Visits': {
      'Archaeological Guide License': 'optional',
      'Tourism Permit': 'optional'
    },
    'Village Tours': {
      'Village Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Tribal Village Visits': {
      'Tribal Area Permit': 'mandatory',
      'Cultural Sensitivity Certificate': 'optional'
    },
    'Craft Workshops': {
      'Workshop Instructor Certificate': 'optional',
      'Business License': 'optional'
    },
    'Pottery Making': {
      'Pottery Instructor Certificate': 'optional',
      'Workshop License': 'optional'
    },
    'Cooking Classes': {
      'Culinary Instructor Certificate': 'optional',
      'Food Safety Certificate': 'mandatory',
      'Business License': 'optional'
    },
    'Local Cuisine Tours': {
      'Food Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
  
    // =====================================================
    // SIGHTSEEING & TOURS
    // =====================================================
    'City Tours': {
      'City Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Bus Tours': {
      'Tour Operator License': 'mandatory',
      'Driver License': 'mandatory',
      'Vehicle Insurance': 'mandatory'
    },
    'Hop-on Hop-off Tours': {
      'Tour Operator License': 'mandatory',
      'Driver License': 'mandatory',
      'Vehicle Insurance': 'mandatory'
    },
    'Walking Tours': {
      'Walking Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Photography Tours': {
      'Photography Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Sunset Tours': {
      'Tour Guide License': 'optional'
    },
    'Sunrise Tours': {
      'Tour Guide License': 'optional'
    },
    'Night Tours': {
      'Night Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Food Tours': {
      'Food Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Street Food Tours': {
      'Food Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Market Tours': {
      'Market Tour Guide License': 'optional'
    },
    'Shopping Tours': {
      'Shopping Tour Guide License': 'optional'
    },
    'Vineyard Tours': {
      'Vineyard Tour Guide License': 'optional',
      'Wine Knowledge Certificate': 'optional'
    },
    'Wine Tasting': {
      'Sommelier Certificate': 'optional',
      'Alcohol License': 'mandatory'
    },
    'Brewery Tours': {
      'Brewery Tour Guide License': 'optional',
      'Alcohol License': 'mandatory'
    },
    'Farm Tours': {
      'Farm Tour Guide License': 'optional',
      'Agriculture Permit': 'optional'
    },
    'Plantation Tours': {
      'Plantation Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Tea Garden Tours': {
      'Tea Garden Tour Guide License': 'optional',
      'Tourism License': 'optional'
    },
    'Coffee Plantation Tours': {
      'Coffee Tour Guide License': 'optional',
      'Tourism License': 'optional'
    }
  }
  
  // Helper function to get certificates for selected activities
  export function getCertificatesForActivities(activities: string[]): Record<string, 'mandatory' | 'optional'> {
    const allCerts: Record<string, 'mandatory' | 'optional'> = {}
    
    activities.forEach(activity => {
      const certs = REQUIRED_CERTIFICATES[activity]
      if (certs) {
        Object.entries(certs).forEach(([certName, type]) => {
          // If already exists as mandatory, keep it mandatory
          if (allCerts[certName] !== 'mandatory') {
            allCerts[certName] = type
          }
        })
      }
    })
    
    return allCerts
  }
  
  // Get activity categories
  export function getActivityCategory(activity: string): string {
    if (activity.includes('Air') || ['Paragliding', 'Skydiving', 'Hot Air Ballooning'].includes(activity)) {
      return 'Air'
    }
    if (activity.includes('Water') || ['Scuba Diving', 'Surfing', 'Kayaking'].includes(activity)) {
      return 'Water'
    }
    if (activity.includes('Snow') || ['Skiing', 'Snowboarding', 'Ice Skating'].includes(activity)) {
      return 'Snow & Ice'
    }
    if (activity.includes('Wildlife') || activity.includes('Safari') || ['Bird Watching'].includes(activity)) {
      return 'Nature & Wildlife'
    }
    if (activity.includes('Tour') || activity.includes('Walk') || activity.includes('Visit')) {
      return 'Sightseeing & Tours'
    }
    if (activity.includes('Cultural') || activity.includes('Heritage') || activity.includes('Temple')) {
      return 'Cultural & Heritage'
    }
    return 'Land Adventures'
  }
  