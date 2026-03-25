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
        clinicName: "Studio Nutrizionale",
        doctorName: "Dottore",
        address: "Via Limitone 47, San Marcellino (CE), 81030, Italia",
        phone: "+39 333 123 4567",
        email: "info@studionutrizionale.it",
        timezone: "Europe/Rome",
        workingHours: {
          mon: { open: "15:00", close: "19:00" },
          tue: { open: "15:00", close: "19:00" },
          wed: { open: "15:00", close: "19:00" },
          thu: { open: "15:00", close: "19:00" },
          fri: { open: "15:00", close: "19:00" },
          sat: null,
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
        {
          name: "First Visit",
          nameIt: "Prima visita",
          serviceType: "FIRST_VISIT",
          durationMin: 60,
          order: 0,
        },
        {
          name: "Weighing",
          nameIt: "Controllo peso",
          serviceType: "WEIGHING",
          durationMin: 20,
          order: 1,
        },
      ],
    });
    console.log("Services created");
  }

  const templatesCount = await prisma.followUpTemplate.count();
  if (templatesCount === 0) {
    await prisma.followUpTemplate.createMany({
      data: [
        {
          name: "Promemoria appuntamento",
          trigger: "BEFORE_24H",
          offsetDirection: "BEFORE",
          offsetValue: 1,
          offsetUnit: "DAYS",
          serviceScope: "ALL",
          messageIt:
            "Ciao! 😊\nTi ricordo l'appuntamento di domani, {{appointment_date}}, alle ore {{appointment_time}} per {{service_name}}.\nSe hai bisogno di spostare l'orario o hai imprevisti, fammi sapere.\nA domani!",
          messageEn: null,
          active: true,
          order: 0,
        },
        {
          name: "Follow-up dieta",
          trigger: "AFTER_5D",
          offsetDirection: "AFTER",
          offsetValue: 5,
          offsetUnit: "DAYS",
          serviceScope: "FIRST_VISIT_ONLY",
          messageIt:
            "Ciao! 😊\nVolevo chiederti come sta andando la dieta dopo la tua {{service_name}} del {{appointment_date}}.\nHai riscontrato difficoltà oppure ti stai trovando bene?\nSe hai dubbi o bisogno di qualche chiarimento, scrivimi pure!\nA presto 💬",
          messageEn: null,
          active: true,
          order: 1,
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
