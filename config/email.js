import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendNewTicketNotification = async (ticket, user) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not configured. Skipping admin notification email.');
    return;
  }

  const subject = `New Ticket Created: ${ticket.ticketId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">AK SecureTech Ltd - New Ticket Created</h2>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong style="color: #374151;">Ticket ID:</strong> <span style="color: #1f2937;">${ticket.ticketId}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Category:</strong> <span style="color: #1f2937;">${ticket.category}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Title:</strong> <span style="color: #1f2937;">${ticket.title}</span></p>
        </div>

        <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 5px 0;"><strong style="color: #374151;">Name:</strong> <span style="color: #1f2937;">${user.name}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Company:</strong> <span style="color: #1f2937;">${user.companyName}</span></p>
        </div>

        <div style="margin: 20px 0;">
          <p style="margin: 10px 0;"><strong style="color: #374151;">Description:</strong></p>
          <p style="background-color: #f9fafb; padding: 12px; border-radius: 4px; color: #4b5563; line-height: 1.6;">${ticket.description}</p>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Phone:</strong> ${user.phone}</p>
          ${ticket.preferredVisitAt ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Preferred Visit Time:</strong> ${new Date(ticket.preferredVisitAt).toLocaleString()}</p>` : ''}
          <p style="margin: 10px 0;">
            <a href="https://www.google.com/maps?q=${ticket.location.lat},${ticket.location.lng}" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: 500;">📍 View Location on Google Maps</a>
          </p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail(adminEmail, subject, html);
};

export const sendTicketConfirmation = async (ticket, user) => {
  const subject = `Ticket Confirmation: ${ticket.ticketId}`;
  const html = `
    <h2>Ticket Created Successfully</h2>
    <p>Dear ${user.name},</p>
    <p>Your ticket has been created successfully.</p>
    <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
    <p><strong>Category:</strong> ${ticket.category}</p>
    <p><strong>Title:</strong> ${ticket.title}</p>
    <p><strong>Status:</strong> ${ticket.status}</p>
    <p>We will review your ticket and get back to you soon.</p>
  `;
  
  await sendEmail(user.email, subject, html);
};

export const sendAdminReplyNotification = async (ticket, user, replyNote, visitDateTime = null, isClosed = false) => {
  if (!user.email) {
    console.warn('User email not found. Skipping reply notification email.');
    return;
  }

  const subject = isClosed 
    ? `Your ticket has been resolved and closed` 
    : `Admin Reply on Ticket: ${ticket.ticketId}`;
  
  const scheduledVisitTime = visitDateTime 
    ? new Date(visitDateTime).toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    : (ticket.assignedVisitAt 
        ? new Date(ticket.assignedVisitAt).toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })
        : null);
  
  const visitInfo = scheduledVisitTime
    ? `<div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;"><strong style="color: #78350f;">📅 Scheduled Visit Time:</strong> <span style="color: #92400e; font-weight: 600;">${scheduledVisitTime}</span></p>
      </div>`
    : '';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #10b981; padding-bottom: 10px;">AK SecureTech Ltd - Admin Reply</h2>
        
        <p style="color: #4b5563; line-height: 1.6;">Dear <strong>${user.name}</strong>,</p>
        <p style="color: #4b5563; line-height: 1.6;">You have received a reply from our admin team regarding your ticket.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong style="color: #374151;">Ticket ID:</strong> <span style="color: #1f2937;">${ticket.ticketId}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Category:</strong> <span style="color: #1f2937;">${ticket.category}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Title:</strong> <span style="color: #1f2937;">${ticket.title}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Description:</strong> <span style="color: #1f2937;">${ticket.description}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Current Status:</strong> <span style="color: #1f2937;">${ticket.status === 'Open' ? 'New' : ticket.status}</span></p>
        </div>

        ${visitInfo}

        <div style="margin: 20px 0;">
          <h3 style="color: #1f2937; margin-bottom: 10px;">Admin Reply:</h3>
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 15px 0;">
            <p style="margin: 0; color: #1e40af; line-height: 1.8; white-space: pre-wrap;">${replyNote.replace(/\n/g, '<br>')}</p>
          </div>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">You can view all updates on your ticket in your dashboard.</p>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">Thank you for your patience.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">AK SecureTech Ltd - Installation and Services</p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail(user.email, subject, html);
};

export const sendNewServiceRequestNotification = async (serviceRequest, user) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not configured. Skipping admin notification email.');
    return;
  }

  const subject = `New Service Request: ${serviceRequest.requestId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #10b981; padding-bottom: 10px;">AK SecureTech Ltd - New Service Request</h2>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong style="color: #374151;">Request ID:</strong> <span style="color: #1f2937;">${serviceRequest.requestId}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Category:</strong> <span style="color: #1f2937;">${serviceRequest.category}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Title:</strong> <span style="color: #1f2937;">${serviceRequest.title}</span></p>
        </div>

        <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 5px 0;"><strong style="color: #374151;">Name:</strong> <span style="color: #1f2937;">${user.name}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Company:</strong> <span style="color: #1f2937;">${user.companyName}</span></p>
        </div>

        <div style="margin: 20px 0;">
          <p style="margin: 10px 0;"><strong style="color: #374151;">Description:</strong></p>
          <p style="background-color: #f9fafb; padding: 12px; border-radius: 4px; color: #4b5563; line-height: 1.6;">${serviceRequest.description}</p>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Phone:</strong> ${user.phone}</p>
          ${serviceRequest.preferredVisitAt ? `<p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Preferred Visit Time:</strong> ${new Date(serviceRequest.preferredVisitAt).toLocaleString()}</p>` : ''}
          <p style="margin: 10px 0;">
            <a href="https://www.google.com/maps?q=${serviceRequest.location.lat},${serviceRequest.location.lng}" target="_blank" style="color: #10b981; text-decoration: none; font-weight: 500;">📍 View Location on Google Maps</a>
          </p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail(adminEmail, subject, html);
};

export const sendServiceRequestConfirmation = async (serviceRequest, user) => {
  const subject = `Service Request Confirmation: ${serviceRequest.requestId}`;
  const html = `
    <h2>Service Request Created Successfully</h2>
    <p>Dear ${user.name},</p>
    <p>Your service request has been created successfully.</p>
    <p><strong>Request ID:</strong> ${serviceRequest.requestId}</p>
    <p><strong>Category:</strong> ${serviceRequest.category}</p>
    <p><strong>Title:</strong> ${serviceRequest.title}</p>
    <p><strong>Status:</strong> ${serviceRequest.status}</p>
    <p>We will review your service request and get back to you soon.</p>
  `;
  
  await sendEmail(user.email, subject, html);
};

export const sendServiceRequestReplyNotification = async (serviceRequest, user, replyNote, visitDateTime = null, isFinal = false) => {
  if (!user.email) {
    console.warn('User email not found. Skipping reply notification email.');
    return;
  }

  const subject = isFinal 
    ? `Your service request has been ${serviceRequest.status === 'Completed' ? 'completed' : 'updated'}`
    : `Admin Reply on Service Request: ${serviceRequest.requestId}`;
  
  const scheduledVisitTime = visitDateTime 
    ? new Date(visitDateTime).toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    : (serviceRequest.assignedVisitAt 
        ? new Date(serviceRequest.assignedVisitAt).toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })
        : null);
  
  const visitInfo = scheduledVisitTime
    ? `<div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;"><strong style="color: #78350f;">📅 Scheduled Visit Time:</strong> <span style="color: #92400e; font-weight: 600;">${scheduledVisitTime}</span></p>
      </div>`
    : '';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #10b981; padding-bottom: 10px;">AK SecureTech Ltd - Service Request Update</h2>
        
        <p style="color: #4b5563; line-height: 1.6;">Dear <strong>${user.name}</strong>,</p>
        <p style="color: #4b5563; line-height: 1.6;">You have received an update from our admin team regarding your service request.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong style="color: #374151;">Request ID:</strong> <span style="color: #1f2937;">${serviceRequest.requestId}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Category:</strong> <span style="color: #1f2937;">${serviceRequest.category}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Title:</strong> <span style="color: #1f2937;">${serviceRequest.title}</span></p>
          <p style="margin: 5px 0;"><strong style="color: #374151;">Current Status:</strong> <span style="color: #1f2937;">${serviceRequest.status}</span></p>
        </div>

        ${visitInfo}

        <div style="margin: 20px 0;">
          <h3 style="color: #1f2937; margin-bottom: 10px;">Admin Reply:</h3>
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; border-left: 4px solid #10b981; margin: 15px 0;">
            <p style="margin: 0; color: #1e40af; line-height: 1.8; white-space: pre-wrap;">${replyNote.replace(/\n/g, '<br>')}</p>
          </div>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">You can view all updates on your service request in your dashboard.</p>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">Thank you for your patience.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">AK SecureTech Ltd - Installation and Services</p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail(user.email, subject, html);
};



