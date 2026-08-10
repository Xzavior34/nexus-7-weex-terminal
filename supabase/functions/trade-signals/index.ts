import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradeSignal {
  type: 'log' | 'trade' | 'price' | 'opportunity' | 'risk_update' | 'position_update'
  timestamp: string
  data: Record<string, unknown>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'POST') {
      const signal: TradeSignal = await req.json()
      
      console.log(`[TRADE-SIGNALS] Received ${signal.type} signal:`, JSON.stringify(signal.data))

      // Broadcast to all connected clients via Supabase Realtime
      const channel = supabase.channel('trade-signals')
      
      await channel.send({
        type: 'broadcast',
        event: signal.type,
        payload: {
          ...signal.data,
          timestamp: signal.timestamp || new Date().toISOString(),
        }
      })

      console.log(`[TRADE-SIGNALS] Broadcasted ${signal.type} event successfully`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Signal ${signal.type} broadcasted`,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // GET request - health check
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'healthy',
          service: 'Nexus-7 Trade Signals',
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[TRADE-SIGNALS] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
