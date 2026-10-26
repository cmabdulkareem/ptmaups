/* Central site content. Demonstration records are marked isSample: true. */

(function () {
  "use strict";

  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var nextMonth = new Date(year, month + 1, 1);

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function isoDate(y, m, d) {
    return y + "-" + pad(m + 1) + "-" + pad(d);
  }

  function safeDay(d, maxDay) {
    return Math.min(d, maxDay);
  }

  var daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  var daysInNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();

  window.SCHOOL_DATA = {
    school: {
      name: "Panakkad Thangal Memorial AUP School, Bedira",
      shortName: "AUP School, Bedira",
      location: "Bedira-Chala, Kasaragod, Kerala, India",
      established: 1976,
      motto: "Educating for Life."
    },

    announcement: {
      message: "Welcome to Panakkad Thangal Memorial AUP School, Bedira.",
      updated: "2026-10-23"
    },

    notices: [
      {
        id: "notice-sample-1",
        title: "Sample notice: Parent–teacher meeting",
        category: "General",
        date: "2026-10-15",
        excerpt: "A sample record showing how the school can publish a general notice. This is demonstration content, not an official announcement.",
        body: [
          "This is a demonstration notice. It is displayed so that the notice board, search, filtering and sorting features can be reviewed before official notices are added.",
          "Official notices will carry confirmed dates and instructions from the school office. This sample does not represent a real meeting or schedule."
        ],
        isSample: true
      },
      {
        id: "notice-sample-2",
        title: "Sample notice: Examination schedule",
        category: "Academic",
        date: "2026-10-08",
        excerpt: "A sample academic notice illustrating the layout for examination-related information. No real schedule is published here.",
        body: [
          "This demonstration record shows where an examination schedule would appear once approved by the school.",
          "No dates, subjects or examination details in this sample should be treated as official."
        ],
        isSample: true
      },
      {
        id: "notice-sample-3",
        title: "Sample notice: Admission enquiry window",
        category: "Admissions",
        date: "2026-09-28",
        excerpt: "A sample admissions notice used to demonstrate the notice categories and read-more interaction.",
        body: [
          "This sample shows how admission-related notices can be listed. Admission availability, eligibility and deadlines must be confirmed with the school office.",
          "The school website does not currently publish verified admission dates."
        ],
        isSample: true
      },
      {
        id: "notice-sample-4",
        title: "Sample notice: Cultural programme",
        category: "Events",
        date: "2026-09-20",
        excerpt: "A sample events notice demonstrating how programmes and celebrations can be announced on the notice board.",
        body: [
          "This is demonstration content for an events notice. It does not describe a confirmed programme.",
          "Approved event notices will be published by the school with confirmed dates and participation details."
        ],
        isSample: true
      },
      {
        id: "notice-sample-5",
        title: "Sample notice: Holiday information",
        category: "Holidays",
        date: "2026-09-12",
        excerpt: "A sample holiday notice. Official holiday dates will be published by the school office, not by this demonstration record.",
        body: [
          "This sample illustrates where a holiday notice would be displayed once the academic calendar is confirmed.",
          "Please do not rely on this demonstration record for holiday dates."
        ],
        isSample: true
      },
      {
        id: "notice-sample-6",
        title: "Sample notice: Reading week",
        category: "Academic",
        date: "2026-08-30",
        excerpt: "A sample notice showing how longer descriptions expand with the read-more control.",
        body: [
          "This demonstration record is intentionally written as a longer notice so that the expand and collapse interaction can be tested.",
          "It might describe a reading week, library activity or class-level programme, but it is not a record of an actual school event.",
          "Official notices will be added by the school office as they are approved."
        ],
        isSample: true
      }
    ],

    events: [
      {
        id: "event-sample-1",
        title: "Sample event: Parent orientation",
        category: "Announcements",
        date: "2026-10-27",
        excerpt: "A demonstration event record for an orientation session. This is sample content, not a confirmed school event.",
        body: [
          "This sample event shows how an announcement can appear on the News and Events page and in the detail view.",
          "No real orientation session is confirmed by this record. Official events will be published with confirmed dates, times and venues."
        ],
        past: false,
        isSample: true
      },
      {
        id: "event-sample-2",
        title: "Sample event: Sports meet",
        category: "Activities",
        date: "2026-10-30",
        excerpt: "A sample activities event used to demonstrate filtering, event cards and the detail modal.",
        body: [
          "This is demonstration content. It describes a hypothetical sports meet only so the page interactions can be tested.",
          "Any real sports programme will be announced separately by the school, with confirmed details."
        ],
        past: false,
        isSample: true
      },
      {
        id: "event-sample-3",
        title: "Sample event: Science and reading week",
        category: "Academic",
        date: "2026-11-03",
        excerpt: "A sample academic event illustrating how a week-long learning programme could be presented.",
        body: [
          "This demonstration record is not an announcement of a real school programme. It exists to show the event category filter and modal layout.",
          "Official academic events will be published once confirmed."
        ],
        past: false,
        isSample: true
      },
      {
        id: "event-sample-4",
        title: "Sample event: Annual Day celebration",
        category: "Events",
        date: "2026-11-14",
        excerpt: "A sample celebration record. No annual day date or programme has been officially confirmed on this website.",
        body: [
          "This sample shows how a school celebration can be listed with a category, date and description.",
          "The record is demonstration content and should not be read as an official annual day announcement."
        ],
        past: false,
        isSample: true
      },
      {
        id: "event-sample-5",
        title: "Sample event: Arts festival",
        category: "Events",
        date: "2026-12-05",
        excerpt: "A sample event created to demonstrate category filters and the event detail layout.",
        body: [
          "This is sample content for the website framework. It does not announce a confirmed arts festival.",
          "The school office will publish official event information when available."
        ],
        past: false,
        isSample: true
      },
      {
        id: "event-sample-6",
        title: "Sample event: Reading day",
        category: "Academic",
        date: "2026-09-05",
        excerpt: "A past sample record, included only to demonstrate the past events section.",
        body: [
          "This demonstration record is placed in the past so the archive section can be reviewed.",
          "It is not a record of a real school activity."
        ],
        past: true,
        isSample: true
      },
      {
        id: "event-sample-7",
        title: "Sample event: Community clean-up",
        category: "Activities",
        date: "2026-08-15",
        excerpt: "A past sample record used to demonstrate the archive list. It is not a real school event.",
        body: [
          "This sample shows how a past event could be listed. It is demonstration content only.",
          "Official information about school activities will be published by the school office."
        ],
        past: true,
        isSample: true
      }
    ],

    gallery: [],

    calendarEvents: [
      {
        date: isoDate(year, month, safeDay(8, daysInCurrentMonth)),
        title: "Sample: Reading week",
        category: "Academic",
        description: "Demonstration calendar entry. This is not an official school date.",
        isSample: true
      },
      {
        date: isoDate(year, month, safeDay(16, daysInCurrentMonth)),
        title: "Sample: Parent–teacher meeting",
        category: "General",
        description: "Demonstration calendar entry, included to show how event details appear.",
        isSample: true
      },
      {
        date: isoDate(year, month, safeDay(24, daysInCurrentMonth)),
        title: "Sample: Cultural programme",
        category: "Events",
        description: "Demonstration calendar entry. No real programme is confirmed.",
        isSample: true
      },
      {
        date: isoDate(nextMonth.getFullYear(), nextMonth.getMonth(), safeDay(5, daysInNextMonth)),
        title: "Sample: Sports day",
        category: "Activities",
        description: "Demonstration calendar entry for the following month.",
        isSample: true
      }
    ],

    faqs: [
      {
        question: "How do I enquire about admission?",
        answer: "Use the admission enquiry form on this website or contact the school office. The form on this website is a demonstration and does not transmit information, so enquiries must be made directly to the school once official contact details are published."
      },
      {
        question: "Which classes are open for admission?",
        answer: "Classes open for admission, seat availability and eligibility have not yet been confirmed for publication on this website. Please confirm these details with the school office."
      },
      {
        question: "What documents are required?",
        answer: "The official document list will be published by the school. Until then, the admissions page marks this information as awaiting confirmation."
      },
      {
        question: "Where can I find the fee structure?",
        answer: "Fees are not published on this website. Any fee information must come directly from the school office."
      },
      {
        question: "How can I contact the school?",
        answer: "The school is located in Bedira, Chala, Kasaragod, Kerala. The full postal address, telephone number, official email address and office hours are awaiting confirmation and will be added to the contact page once approved."
      }
    ]
  };

  window.SCHOOL_DATA.months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
})();
