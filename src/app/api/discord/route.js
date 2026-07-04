export async function POST(request) {
  try {
    const { botToken, channelId, applicantName, applicantEmail, companyName, companyWebsite, pdfBase64 } = await request.json();

    if (!botToken || !channelId) {
      return Response.json({ error: 'Discord Bot Token and Channel ID are required' }, { status: 400 });
    }

    const embed = {
      title: 'New Company Research Report',
      color: 0xEAB308,
      fields: [
        {
          name: 'Applicant Details',
          value: `**Name:** ${applicantName || 'N/A'}\n**Email:** ${applicantEmail || 'N/A'}`,
          inline: false,
        },
        {
          name: 'Research Details',
          value: `**Company:** ${companyName || 'N/A'}\n**Website:** ${companyWebsite || 'N/A'}`,
          inline: false,
        },
      ],
      footer: {
        text: 'CompanyIQ AI',
      },
      timestamp: new Date().toISOString(),
    };

    if (pdfBase64) {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      const fileName = `${(companyName || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-research-report.pdf`;
      const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

      const payloadJson = JSON.stringify({ embeds: [embed] });

      // Assemble multipart body: JSON payload + PDF file attachment
      const formBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${payloadJson}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`),
        pdfBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const discordResponse = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: formBody,
        }
      );

      if (!discordResponse.ok) {
        const errorText = await discordResponse.text();
        return Response.json({ error: `Discord API error: ${discordResponse.status} - ${errorText}` }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    // Send embed without file attachment
    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      }
    );

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      return Response.json({ error: `Discord API error: ${discordResponse.status} - ${errorText}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
