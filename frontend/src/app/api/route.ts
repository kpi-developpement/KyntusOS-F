import { NextRequest, NextResponse } from 'next/server';

// 🔥 N-tal3ou l-timeout l-5 minutes
export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 [NEXT.JS PROXY] Réception des fichiers depuis le navigateur...");
    
    // 1. N-khlliw Next.js y-parsi l-FormData b' tariqa s7i7a (Bla Raw Stream)
    const formData = await req.formData();
    
    console.log("✅ [NEXT.JS PROXY] Fichiers parsés. Envoi vers Spring Boot (backend:8082)...");

    // 2. L-URL dyal Spring Boot wst Docker
    const backendUrl = "http://backend:8082/api/facture/generate";

    // 3. N-siftou l-FormData l-Spring Boot
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
      // ⚠️ ATTENTION: Ma-kandirouch 'Content-Type' hna! Node.js ghay-dirha auto m3a l-Boundary dyal Multipart
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [SPRING BOOT ERROR]:", errorText);
      return new NextResponse(errorText, { status: response.status });
    }

    // 4. N-qraw l-Excel li rje3 mn Spring Boot
    const arrayBuffer = await response.arrayBuffer();

    console.log("✅ [NEXT.JS PROXY] Fichier Excel reçu avec succès depuis Spring Boot !");

    // 5. N-rej3ouh l-Navigateur
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="Facture_Kyntus.xlsx"',
      },
    });

  } catch (error: any) {
    console.error("❌ [NEXT.JS PROXY ERROR]:", error);
    return new NextResponse("Erreur interne du proxy Next.js: " + error.message, { status: 500 });
  }
}