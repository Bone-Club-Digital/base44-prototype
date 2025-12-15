import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

const BONE_CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e9bb481a7_bone_club_trans.png";
const BONE_CLUB_URL = "https://boneclub.co.uk";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized. You must be logged in to send invitations.' }), { 
                status: 401, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        const { recipient_email, custom_message } = await req.json();

        if (!recipient_email || !/^\S+@\S+\.\S+$/.test(recipient_email)) {
            return new Response(JSON.stringify({ error: 'A valid recipient email is required.' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        const sender_username = user.username || user.full_name || 'A Bone Club Member';
        const subject = `${sender_username} has invited you to join Bone Club!`;
        
        const emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #e5e4cd; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #9fd3ba; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 20px; }
                    .logo { max-width: 150px; height: auto; }
                    .content { color: #5a3217; font-size: 16px; line-height: 1.6; }
                    .message-box { background-color: rgba(255, 255, 255, 0.5); padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007e81; }
                    .cta-button { display: inline-block; background-color: #f26222; color: #ffffff !important; text-decoration: none; padding: 15px 25px; text-align: center; border-radius: 5px; font-weight: bold; font-size: 18px; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #5a3217; opacity: 0.7; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="${BONE_CLUB_LOGO_URL}" alt="Bone Club Logo" class="logo">
                    </div>
                    <div class="content">
                        <h2 style="color: #5a3217; text-align: center;">You're Invited to Join Bone Club!</h2>
                        <p>Your friend, <strong>${sender_username}</strong>, thinks you'd be a great addition to the Bone Club backgammon community and sent you this invitation.</p>
                        ${custom_message ? `
                            <p>They also included a personal message:</p>
                            <div class="message-box">
                                <p><em>"${custom_message.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</em></p>
                            </div>
                        ` : ''}
                        <p><strong>Bone Club</strong> is the premier online destination for competitive backgammon, leagues, and tournaments. Join today!</p>
                        <div style="text-align: center;">
                           <a href="${BONE_CLUB_URL}" class="cta-button">Join Bone Club Now</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Bone Club. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
            throw new Error("Email service is not configured. RESEND_API_KEY is missing.");
        }

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Bone Club <onboarding@resend.dev>',
                to: [recipient_email],
                subject: subject,
                html: emailBody,
                reply_to: 'bones@boneclub.com'
            })
        });

        if (!resendResponse.ok) {
            // *** START OF CHANGE - DETAILED ERROR LOGGING ***
            const responseBodyText = await resendResponse.text();
            console.error(`Resend API Error: Status ${resendResponse.status}, Body: ${responseBodyText}`);
            throw new Error(`Email sending failed with status ${resendResponse.status}. Details: ${responseBodyText}`);
            // *** END OF CHANGE ***
        }

        return new Response(JSON.stringify({ success: true, message: 'Invitation sent successfully!' }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });

    } catch (error) {
        console.error('Error in sendFriendInvitationEmail function:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
        });
    }
});