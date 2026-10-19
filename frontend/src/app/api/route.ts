import { NextRequest, NextResponse } from 'next/server';

// 🔥 THE FIX: N-tal3ou l-timeout l-5 minutes bash may-qte3ch l-connection
export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 [NEXT.JS PROXY] Transfert des fichiers vers Spring Boot en mode Streaming...");
    
    // L-URL dyal Spring Boot wst Docker
    const backendUrl = "http://backend:8082/api/facture/generate";

    // N-siftou l-Request b' Streaming (bla ma n-chargiwha f' RAM)
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        // Khassna n-khelliw l-Content-Type kima howa 7it fih l-Boundary dyal Multipart
        'Content-Type': req.headers.get('Content-Type') || '',
      },
      body: req.body,
      // @ts-ignore - L-Qaleb dyal Node.js Fetch bash y-qbel Streaming Body
      duplex: 'half',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [SPRING BOOT ERROR]:", errorText);
      return new NextResponse(errorText, { status: response.status });
    }

    // N-qraw l-Excel li rje3 mn Spring Boot
    const arrayBuffer = await response.arrayBuffer();

    console.log("✅ [NEXT.JS PROXY] Fichier Excel reçu avec succès !");

    // N-rej3ouh l-Navigateur
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="Facture.xlsx"',
      },
    });

  } catch (error: any) {
    console.error("❌ [NEXT.JS PROXY ERROR]:", error);
    return new NextResponse("Erreur interne du proxy Next.js: " + error.message, { status: 500 });
  }
}