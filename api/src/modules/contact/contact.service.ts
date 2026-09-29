import { Injectable } from '@nestjs/common';
import { EmailService } from '../email';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private emailService: EmailService) {}

  async submit(dto: CreateContactDto) {
    // Honeypot field — a bot filled it in, so pretend success without sending anything.
    if (dto.company) return { success: true };

    await this.emailService.sendContactEmail(dto.name, dto.email, dto.subject, dto.message);
    return { success: true };
  }
}
