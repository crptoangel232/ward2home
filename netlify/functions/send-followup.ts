import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

interface FollowupRequest {
  followup_id: string
}

export async function handler(event: { body: string }) {
  try {
    const { followup_id } = JSON.parse(event.body) as FollowupRequest

    if (!followup_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'followup_id is required' }),
      }
    }

    // Update followup status to DONE
    const { error: updateError } = await supabase
      .from('followups')
      .update({ status: 'DONE' })
      .eq('id', followup_id)

    if (updateError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: updateError.message }),
      }
    }

    // Log the check-in
    const { error: logError } = await supabase
      .from('followup_logs')
      .insert({
        followup_id,
        response: 'Message Sent',
        action_taken: 'WhatsApp check-in sent (demo)',
      })

    if (logError) {
      console.error('Log error:', logError.message)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Check-in sent and logged' }),
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    }
  }
}
