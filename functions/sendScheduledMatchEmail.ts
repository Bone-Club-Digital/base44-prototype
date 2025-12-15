import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

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
            .content p { margin: 10px 0; }
            .content hr { border: none; border-top: 1px solid #eeeeee; margin: 20px 0; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background-color: #f26222; color: #ffffff !important; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 18px; }
            .footer { text-align: center; font-size: 12px; color: #777777; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; }
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
    const base44 = createClientFromRequest(req);

    if (!(await base44.auth.isAuthenticated())) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { 
            organizer_email, 
            organizer_name, 
            opponent_id,
            opponent_name,
            proposed_datetime,
            timezone,
            match_details,
            custom_message,
            bones_stake
        } = await req.json();

        let opponent_email = '';
        try {
            const opponentUsers = await base44.asServiceRole.entities.User.filter({ id: opponent_id });
            const opponentUser = opponentUsers[0];

            if (!opponentUser || !opponentUser.email) {
                throw new Error(`Opponent with ID ${opponent_id} not found or has no email.`);
            }
            opponent_email = opponentUser.email;
        } catch (e) {
            console.error(`Failed to fetch opponent's email:`, e);
            return new Response(JSON.stringify({ error: "Could not find opponent's email to send invitation." }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const matchDate = new Date(proposed_datetime);
        
        // Parse match details JSON and format nicely
        let formattedMatchDetails = 'Standard Match';
        try {
            const details = JSON.parse(match_details);
            const parts = [];
            
            if (details.target_score) {
                parts.push(`${details.target_score}-point match`);
            }
            
            if (details.use_clock) {
                parts.push('Timed match');
            }
            
            if (details.use_video_chat) {
                parts.push('Video chat enabled');
            }
            
            formattedMatchDetails = parts.length > 0 ? parts.join(', ') : 'Standard Match';
        } catch (e) {
            console.error('Error parsing match details:', e);
            formattedMatchDetails = match_details; // Fallback to raw string
        }

        const emailContent = `
            <p>Hi ${opponent_name},</p>
            <p>You can accept or decline this invitation from your homepage or your "My Games" page.</p>
            <hr />
            <p><strong>Proposed Time:</strong><br>${matchDate.toLocaleDateString()} at ${matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Match Details:</strong><br>${formattedMatchDetails}</p>
            ${bones_stake > 0 ? `<p><strong>Stakes:</strong><br>${bones_stake} Bones</p>` : ''}
            ${custom_message ? `<p><strong>Message from ${organizer_name}:</strong><br/><i style="color: #555;">"${custom_message}"</i></p>` : ''}
            <hr />
        `;

        const emailHtml = createEmailTemplate({
            title: 'MATCH INVITATION',
            strapline: `${organizer_name} has challenged you to a match!`,
            content: emailContent,
            button_text: 'View My Games',
            button_url: 'https://www.boneclub.co.uk/MyGames'
        });

        await base44.asServiceRole.integrations.Core.SendEmail({
            to: opponent_email,
            from_name: `Bone Club`,
            subject: `Backgammon Match Invite: ${organizer_name} vs ${opponent_name}`,
            body: emailHtml,
        });

        return new Response(JSON.stringify({ success: true, message: 'Invite sent' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in sendScheduledMatchEmail function:", error);
        return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});