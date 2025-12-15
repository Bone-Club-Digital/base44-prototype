
import { createClient } from 'npm:@base44/sdk@0.1.0';

const createEmailTemplate = ({ title, strapline, content, button_text, button_url }) => {
    const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e9bb481a7_bone_club_trans.png";

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&display=swap');
            body { margin: 0; padding: 0; background-color: #9fd3ba; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px 40px; border-radius: 8px; }
            .logo { text-align: center; margin-bottom: 20px; }
            .logo img { max-width: 250px; }
            h1 { font-family: 'Oswald', sans-serif; font-size: 28px; font-weight: 700; text-transform: uppercase; color: #5a3217; text-align: center; margin: 0 0 10px 0; }
            .strapline { font-size: 16px; color: #5a3217; text-align: center; margin: 0 0 30px 0; }
            .content { font-size: 15px; line-height: 1.6; color: #333333; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background-color: #f26222; color: #ffffff !important; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 18px; }
            .footer { text-align: center; font-size: 12px; color: #777777; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; }
            blockquote { border-left: 3px solid #e5e4cd; padding-left: 15px; margin-left: 0; font-style: italic; color: #555; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <img src="${logoUrl}" alt="Bone Club Logo">
            </div>
            <h1>${title}</h1>
            <p class="strapline">${strapline}</p>
            <div class="content">
                ${content}
            </div>
            ${button_text && button_url ? `
            <div class="button-container">
                <a href="${button_url}" target="_blank" class="button">${button_text}</a>
            </div>
            ` : ''}
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Bone Club. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

Deno.serve(async (req) => {
    try {
        const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { recipient_id, subject, body, thread_id } = await req.json();
        if (!recipient_id || !subject || !body) {
            return new Response(JSON.stringify({ error: 'recipient_id, subject, and body are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        let recipientUsername = 'Unknown User';
        let recipientEmail = null;

        try {
            const systemClient = createClient({
                appId: Deno.env.get('BASE44_APP_ID'),
                apiKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
            });
            
            const users = await systemClient.entities.User.filter({ id: recipient_id }, '', 1);
            const recipient = users[0];
            
            if (recipient) {
                recipientUsername = recipient.username || recipient.full_name || 'Unknown User';
                recipientEmail = recipient.email;
            } else {
                const playerStatsList = await systemClient.entities.PlayerStats.filter({ user_id: recipient_id }, '', 1);
                const playerStat = playerStatsList[0];
                if (playerStat) {
                    recipientUsername = playerStat.username || 'Unknown User';
                }
            }
        } catch (fetchError) {
            console.error("sendMessage: Failed to fetch recipient details for ID:", recipient_id, fetchError);
        }
        
        const newMessage = await base44.entities.Message.create({
            sender_id: user.id,
            sender_username: user.username || user.full_name,
            recipient_id: recipient_id,
            recipient_username: recipientUsername,
            type: 'user_message',
            subject: subject,
            body: body,
            status: 'unread',
            thread_id: thread_id || null
        });

        if (recipientEmail) {
            try {
                const emailClient = createClient({
                    appId: Deno.env.get('BASE44_APP_ID'),
                    apiKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
                });

                const emailContent = `
                    <p>Hi ${recipientUsername},</p>
                    <p>You received the following message:</p>
                    <br/>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <blockquote>${body.replace(/\n/g, '<br>')}</blockquote>
                `;

                const emailHtml = createEmailTemplate({
                    title: 'NEW MESSAGE',
                    strapline: `From: ${user.username || user.full_name}`,
                    content: emailContent,
                    button_text: 'View All Messages',
                    button_url: 'https://www.boneclub.co.uk/Messages'
                });

                await emailClient.integrations.Core.SendEmail({
                    to: recipientEmail,
                    from_name: `Bone Club`,
                    subject: `New Bone Club Message: ${subject}`,
                    body: emailHtml
                });
            } catch (emailError) {
                console.error("sendMessage: Failed to send notification email:", emailError);
            }
        }

        return new Response(JSON.stringify({ success: true, message: newMessage }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in sendMessage function:", error);
        return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
