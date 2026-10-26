require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Missing Supabase configuration in environment variables');
  throw new Error('Missing Supabase configuration');
}

/**
 * Admin client with service role key
 * - Bypasses RLS policies
 * - Use for bulk operations, reports, system tasks
 * - NEVER expose this to frontend
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Create user-specific client with JWT
 * - Respects RLS policies
 * - Use for user-specific operations that need audit trail
 * - Pass user's JWT from request header
 * 
 * @param {string} userJwt - User's JWT token from Authorization header
 * @returns {Object} Supabase client with user context
 */
const createUserClient = (userJwt) => {
  if (!userJwt) {
    throw new Error('User JWT is required');
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${userJwt}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

/**
 * Verify if user is admin
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>}
 */
const isUserAdmin = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('user_type')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }

    return data?.user_type === 'admin';
  } catch (error) {
    logger.error('Exception in isUserAdmin:', error);
    return false;
  }
};

/**
 * Get admin role details
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
const getAdminRole = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_roles')
      .select('role, permissions')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching admin role:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Exception in getAdminRole:', error);
    return null;
  }
};

/**
 * Log admin action to audit trail
 * @param {Object} params
 * @param {string} params.adminId - Admin user ID
 * @param {string} params.action - Action performed
 * @param {string} params.entityType - Entity type (e.g., 'vendor', 'booking')
 * @param {string} params.entityId - Entity ID
 * @param {string} params.notes - Optional notes
 */
const logAdminAction = async ({ adminId, action, entityType, entityId, notes }) => {
  try {
    const { error } = await supabaseAdmin
      .from('admin_actions_log')
      .insert({
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        notes
      });

    if (error) {
      logger.error('Failed to log admin action:', error);
    }
  } catch (error) {
    logger.error('Exception in logAdminAction:', error);
  }
};

module.exports = {
  supabaseAdmin,
  createUserClient,
  isUserAdmin,
  getAdminRole,
  logAdminAction
};
