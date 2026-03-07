import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url) {
      throw new Error('URL is required')
    }

    console.log(`Fetching URL: ${url}`)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    const html = await response.text()
    
    // 简单提取标题
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1] : '抓取到的文档'

    // 简单提取 Body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    let bodyContent = bodyMatch ? bodyMatch[1] : html

    // 移除脚本、样式、内联事件等
    bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    bodyContent = bodyContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    bodyContent = bodyContent.replace(/on\w+="[^"]*"/gi, "")
    bodyContent = bodyContent.replace(/<link\b[^>]*>/gi, "")

    return new Response(
      JSON.stringify({ 
        title,
        content: bodyContent 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
