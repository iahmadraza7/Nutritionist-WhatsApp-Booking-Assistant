import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme123";
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@clinic.local";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: "Admin",
    },
  });

  console.log("Admin created:", admin.email);

  const clinic = await prisma.clinicConfig.findFirst();
  if (!clinic) {
    await prisma.clinicConfig.create({
      data: {
        clinicName: "Studio Nutrizionale Dott. Rossi",
        doctorName: "Dott. Marco Rossi",
        address: "Via Roma 42, 20100 Milano",
        phone: "+39 02 1234567",
        email: "info@studionutrizionale.it",
        timezone: "Europe/Rome",
        workingHours: {
          mon: { open: "09:00", close: "18:00" },
          tue: { open: "09:00", close: "18:00" },
          wed: { open: "09:00", close: "18:00" },
          thu: { open: "09:00", close: "18:00" },
          fri: { open: "09:00", close: "18:00" },
          sat: { open: "09:00", close: "13:00" },
          sun: null,
        },
        cancellationPolicy: "Annullare almeno 24 ore prima dell'appuntamento.",
        defaultLanguage: "it",
        medicalFallbackMessage: "Il dottore le risponderà a breve.",
      },
    });
    console.log("Clinic config created");
  }

  const faqsCount = await prisma.fAQEntry.count();
  if (faqsCount === 0) {
    await prisma.fAQEntry.createMany({
      data: [
        {
          order: 0,
          category: "hours",
          language: "it",
          question: "Quali sono gli orari di apertura?",
          answer:
            "Siamo aperti Lun–Ven 09:00–18:00, Sab 09:00–13:00. Domenica chiuso.",
          active: true,
        },
        {
          order: 1,
          category: "location",
          language: "it",
          question: "Dove si trova lo studio?",
          answer: "Lo studio si trova in Via Roma 42, 20100 Milano.",
          active: true,
        },
        {
          order: 2,
          category: "booking",
          language: "it",
          question: "Come posso prenotare un appuntamento?",
          answer:
            "Può prenotare qui su WhatsApp: mi dica 'Voglio prenotare' e la guiderò passo per passo.",
          active: true,
        },
        {
          order: 3,
          category: "cancellation",
          language: "it",
          question: "Qual è la politica di cancellazione?",
          answer:
            "La cancellazione è possibile fino a 24 ore prima dell'appuntamento. In caso di dubbi, contatti la clinica.",
          active: true,
        },
      ],
    });
    console.log("FAQs created");
  }

  const servicesCount = await prisma.service.count();
  if (servicesCount === 0) {
    await prisma.service.createMany({
      data: [
        { name: "First Consultation", nameIt: "Prima visita", durationMin: 60, order: 0 },
        { name: "Follow-up Consultation", nameIt: "Visita di controllo", durationMin: 45, order: 1 },
        { name: "Nutritional Plan Review", nameIt: "Revisione piano alimentare", durationMin: 30, order: 2 },
      ],
    });
    console.log("Services created");
  }

  const templatesCount = await prisma.followUpTemplate.count();
  if (templatesCount === 0) {
    await prisma.followUpTemplate.createMany({
      data: [
        {
          name: "Reminder 24h",
          trigger: "BEFORE_24H",
          messageIt: "Gentile paziente, le ricordiamo l'appuntamento di domani. A domani!",
          messageEn: "Dear patient, we remind you of tomorrow's appointment. See you soon!",
          active: true,
          order: 0,
        },
        {
          name: "Reminder 2h",
          trigger: "BEFORE_2H",
          messageIt: "Il suo appuntamento è tra 2 ore. La aspettiamo!",
          messageEn: "Your appointment is in 2 hours. We look forward to seeing you!",
          active: true,
          order: 1,
        },
        {
          name: "Follow-up 1 day",
          trigger: "AFTER_1D",
          messageIt: "Come si sente dopo la visita di ieri? Se ha domande, siamo a disposizione.",
          messageEn: "How are you feeling after yesterday's visit? We're here if you have questions.",
          active: true,
          order: 2,
        },
        {
          name: "Check-in 3 days",
          trigger: "AFTER_3D",
          messageIt: "Buongiorno! Come sta andando con il piano alimentare?",
          messageEn: "Good morning! How is the nutrition plan going?",
          active: true,
          order: 3,
        },
      ],
    });
    console.log("Follow-up templates created");
  }

  const patientsCount = await prisma.patient.count();
  if (patientsCount === 0) {
    await prisma.patient.createMany({
      data: [
        { fullName: "Mario Bianchi", phone: "393331234567" },
        { fullName: "Laura Verdi", phone: "393339876543" },
        { fullName: "Giuseppe Neri", phone: "393335554443" },
      ],
    });
    console.log("Demo patients created");
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
