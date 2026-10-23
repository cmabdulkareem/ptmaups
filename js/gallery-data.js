/* School memories archive. Add one record per occasion or themed collection.
   The gallery sorts entries chronologically, so data can be added in any order.

   Record shape:
   {
     id: "unique-record-id",
     date: "YYYY-MM-DD",       // full date; may be "YYYY-MM" or "YYYY"
     year: 2024,               // required only when no usable date is supplied
     title: "Event title",
     description: "A short account of the occasion.",
     notes: ["Short observation", "Short observation"], // optional aside shown beside the entry
     isSample: true,           // shows the Sample label on the entry
     photos: [
       { src: "assets/images/gallery/file.jpg", alt: "Accessible description", caption: "Optional caption" }
     ]
   }

   Use an empty photos array for an entry whose photographs are not ready.
   Only school-approved photographs with appropriate consent and captions
   should be added.

   The records below are demonstration content: titles, captions and dates are
   sample copy, and the photographs are a local preview selection. Confirm the
   final selection, consent and accurate dates with the school before launch. */

window.SCHOOL_MEMORIES = [
  {
    id: "sample-school-ground",
    date: "2021",
    title: "Moments on the school ground",
    description: "Two moments on the red-earth ground: a wide circle of students around the playground slide, and a fancy-dress line-up before the school building.",
    notes: [
      "Students in white and blue uniforms form a wide ring around the playground slide.",
      "Handmade flags and freedom-fighter costumes fill the front row."
    ],
    isSample: true,
    photos: [
      {
        src: "assets/images/gallery/reading-room.jpg",
        alt: "A large group of students in white and blue uniforms gathered in a circle around a playground slide on a red-earth school ground, with a teacher standing on the slide.",
        caption: "A circle forms around the playground slide."
      },
      {
        src: "assets/images/gallery/sports-equipment.jpg",
        alt: "Children in white uniforms and freedom-fighter fancy dress, some holding Indian flags, lined up in front of a three-storey school building.",
        caption: "Fancy dress and tricolour flags before the school building."
      }
    ]
  },
  {
    id: "sample-library-hall",
    date: "2022",
    title: "Inside the library hall",
    description: "A handmade illustrated sheet is held up beneath the CLASSMATES76 library hall banner; in another photograph, rows of laptops face a lesson projected onto the screen.",
    notes: [
      "A handmade illustrated sheet is held up beneath the library hall banner.",
      "Rows of laptops face a lesson projected onto the front screen."
    ],
    isSample: true,
    photos: [
      {
        src: "assets/images/gallery/sports-finish.jpg",
        alt: "Two women in saris holding up a handmade illustrated sheet in a library hall, with wall charts and a Hindi programme banner behind them.",
        caption: "An illustrated sheet presented in the library hall."
      },
      {
        src: "assets/images/gallery/art-paper.jpg",
        alt: "Students seated at rows of laptops in a library hall, following a lesson projected onto a screen.",
        caption: "A laptop lesson in the library hall."
      }
    ]
  },
  {
    id: "sample-school-outings",
    date: "2023",
    title: "School days out",
    description: "A temple visit, a theme-park stop, a gathering by the water and a scout troop at rest: four moments from school outings.",
    notes: [
      "The temple tower, the Wonderla arch and the waterfront each frame a group photograph.",
      "Scout scarves, handwritten placards and backpacks travel with the students."
    ],
    isSample: true,
    photos: [
      {
        src: "assets/images/gallery/sports-track.jpg",
        alt: "A school group posing in front of a tall yellow temple tower under a blue sky, with a student in a wheelchair in the foreground.",
        caption: "A group photograph below the temple tower."
      },
      {
        src: "assets/images/gallery/monsoon-courtyard.jpg",
        alt: "A large school group posed in front of the Wonderla entrance, with adults standing among the students.",
        caption: "The group at the Wonderla entrance."
      },
      {
        src: "assets/images/gallery/monsoon-veranda.jpg",
        alt: "Adults and students on a sandy riverbank holding handwritten placards, with a wide stretch of water and trees behind them.",
        caption: "Handwritten placards held up beside the water."
      },
      {
        src: "assets/images/gallery/art-display.jpg",
        alt: "A scout troop in blue uniforms and pink scarves sitting along the base of a large tree beside a no-parking sign.",
        caption: "The scout troop seated on the tree base."
      }
    ]
  },
  {
    id: "sample-colour-and-celebration",
    date: "2024",
    title: "Colour and celebration",
    description: "Performance costumes, painted palms and a doorway portrait bring colour to this set of school-day photographs.",
    notes: [
      "Gold-trimmed costumes and flowers stand out in the open air.",
      "Blue and green painted hands are held up against white outfits."
    ],
    isSample: true,
    photos: [
      {
        src: "assets/images/gallery/art-paints.jpg",
        alt: "Two students in gold-trimmed traditional dance costumes with flowers in their hair, smiling at each other outdoors.",
        caption: "Two students dressed for a performance."
      },
      {
        src: "assets/images/gallery/art-clay.jpg",
        alt: "Students in white outfits showing hands painted blue and green, with adults standing at either side.",
        caption: "Painted hands held up for the camera."
      },
      {
        src: "assets/images/gallery/art-drying.jpg",
        alt: "Four students in blue school uniforms standing close together beside a classroom doorway.",
        caption: "Four students by the classroom door."
      }
    ]
  },
  {
    id: "sample-awaiting-cataloguing",
    title: "Photographs awaiting cataloguing",
    description: "A sample entry reserved for prints that are still being catalogued and dated. No photographs are attached yet.",
    notes: [
      "Prints are still being catalogued and matched to their dates.",
      "No photographs are attached until the details can be confirmed."
    ],
    isSample: true,
    photos: []
  }
];
