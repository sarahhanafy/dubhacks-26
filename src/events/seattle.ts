// Curated SAMPLE events for the demo week (Sun Oct 18 – Sat Oct 24, 2026, Pacific time).
// Places are real Seattle-area parks and neighborhoods; hosts and events are illustrative
// and labeled as sample data everywhere they appear.

export type Category = "cafe" | "sports" | "swim" | "outdoors" | "music" | "food" | "art" | "wellness" | "community";

export interface CommunityEvent {
  id: string;
  title: string;
  category: Category;
  emoji: string;
  host: string;
  neighborhood: string;
  place: string;
  lat: number;
  lng: number;
  start: string; // ISO with offset
  end: string;
  cost: number; // USD per person
  capacity: number;
  going: number; // sample RSVPs
  beginnerFriendly: boolean;
  recurring?: string; // e.g. "every Sunday"
  blurb: string;
  isSample: true;
}

const e = (x: Omit<CommunityEvent, "isSample">): CommunityEvent => ({ ...x, isSample: true });

export const EVENTS: CommunityEvent[] = [
  e({ id: "e01", title: "Pop-up pour-over bar", category: "cafe", emoji: "☕", host: "Drift Coffee pop-up", neighborhood: "Capitol Hill", place: "Cal Anderson Park", lat: 47.6170, lng: -122.3191,
    start: "2026-10-18T09:00:00-07:00", end: "2026-10-18T12:00:00-07:00", cost: 5, capacity: 40, going: 23, beginnerFriendly: true, recurring: "every Sunday",
    blurb: "Rotating single-origin pours from a cart, plus a shared table for strangers to sit together." }),
  e({ id: "e02", title: "Open-play pickleball", category: "sports", emoji: "🏓", host: "Green Lake Paddlers", neighborhood: "Green Lake", place: "Green Lake Park courts", lat: 47.6805, lng: -122.3290,
    start: "2026-10-18T14:00:00-07:00", end: "2026-10-18T16:00:00-07:00", cost: 0, capacity: 16, going: 11, beginnerFriendly: true, recurring: "every Sunday",
    blurb: "Rotate partners every game. Loaner paddles at the bench, no experience needed." }),
  e({ id: "e03", title: "Discovery Park sunset hike", category: "outdoors", emoji: "🥾", host: "Trailheads Seattle", neighborhood: "Magnolia", place: "Discovery Park lighthouse loop", lat: 47.6573, lng: -122.4059,
    start: "2026-10-18T16:30:00-07:00", end: "2026-10-18T18:30:00-07:00", cost: 0, capacity: 25, going: 14, beginnerFriendly: true,
    blurb: "Easy 3-mile loop down to the beach for sunset. Group walks at a chatty pace." }),
  e({ id: "e04", title: "Cold plunge + sauna social", category: "wellness", emoji: "🧖", host: "Salt & Steam collective", neighborhood: "Ballard", place: "Golden Gardens Park", lat: 47.6920, lng: -122.4034,
    start: "2026-10-19T07:00:00-07:00", end: "2026-10-19T08:30:00-07:00", cost: 12, capacity: 12, going: 9, beginnerFriendly: false, recurring: "every Monday",
    blurb: "Mobile sauna on the beach, a quick dip in the Sound, then coffee by the fire." }),
  e({ id: "e05", title: "Beginner lap swim meetup", category: "swim", emoji: "🏊", host: "Lap Lane Club", neighborhood: "Queen Anne", place: "Queen Anne Pool", lat: 47.6378, lng: -122.3604,
    start: "2026-10-19T18:30:00-07:00", end: "2026-10-19T19:30:00-07:00", cost: 6, capacity: 20, going: 8, beginnerFriendly: true, recurring: "every Monday",
    blurb: "Coach-led drills for newer swimmers, split into lanes by pace. Pool entry fee only." }),
  e({ id: "e06", title: "Run club + bagels", category: "sports", emoji: "🏃", host: "Fremont Run Crew", neighborhood: "Fremont", place: "Fremont Troll", lat: 47.6510, lng: -122.3473,
    start: "2026-10-20T18:00:00-07:00", end: "2026-10-20T19:15:00-07:00", cost: 0, capacity: 60, going: 37, beginnerFriendly: true, recurring: "every Tuesday",
    blurb: "3 or 5 miles along the Burke-Gilman, no one gets dropped. Bagels after." }),
  e({ id: "e07", title: "Board game night", category: "community", emoji: "🎲", host: "U District Tabletop", neighborhood: "U District", place: "University Heights Center", lat: 47.6625, lng: -122.3140,
    start: "2026-10-20T19:00:00-07:00", end: "2026-10-20T22:00:00-07:00", cost: 3, capacity: 50, going: 26, beginnerFriendly: true, recurring: "every Tuesday",
    blurb: "Hundreds of games and volunteers who teach. Come solo, you'll get seated with a table." }),
  e({ id: "e08", title: "Open mic & acoustic jam", category: "music", emoji: "🎸", host: "Wallingford Sessions", neighborhood: "Wallingford", place: "Meridian Park", lat: 47.6600, lng: -122.3335,
    start: "2026-10-21T19:00:00-07:00", end: "2026-10-21T21:00:00-07:00", cost: 0, capacity: 40, going: 15, beginnerFriendly: true,
    blurb: "Sign up for a two-song slot or just sit in the circle and listen." }),
  e({ id: "e09", title: "Pop-up dumpling workshop", category: "food", emoji: "🥟", host: "Fold & Pleat kitchen", neighborhood: "Chinatown-ID", place: "Hing Hay Park", lat: 47.5985, lng: -122.3248,
    start: "2026-10-21T18:00:00-07:00", end: "2026-10-21T20:00:00-07:00", cost: 15, capacity: 18, going: 16, beginnerFriendly: true,
    blurb: "Learn three folds, then eat everything you made. Veggie filling available." }),
  e({ id: "e10", title: "Drop-in volleyball", category: "sports", emoji: "🏐", host: "Alki Sand Crew", neighborhood: "West Seattle", place: "Alki Beach courts", lat: 47.5790, lng: -122.4100,
    start: "2026-10-22T17:30:00-07:00", end: "2026-10-22T19:30:00-07:00", cost: 0, capacity: 24, going: 12, beginnerFriendly: false, recurring: "every Thursday",
    blurb: "Pickup doubles and fours on the sand while there's light." }),
  e({ id: "e11", title: "Sketch & sip", category: "art", emoji: "🎨", host: "Pencil Pushers", neighborhood: "Capitol Hill", place: "Volunteer Park conservatory lawn", lat: 47.6301, lng: -122.3150,
    start: "2026-10-22T18:00:00-07:00", end: "2026-10-22T20:00:00-07:00", cost: 8, capacity: 30, going: 19, beginnerFriendly: true,
    blurb: "Supplies and tea provided. A short prompt, then everyone shares (or doesn't)." }),
  e({ id: "e12", title: "Lake Union paddle", category: "outdoors", emoji: "🛶", host: "Northwest Paddlers", neighborhood: "South Lake Union", place: "Lake Union Park", lat: 47.6270, lng: -122.3370,
    start: "2026-10-23T17:00:00-07:00", end: "2026-10-23T19:00:00-07:00", cost: 20, capacity: 14, going: 10, beginnerFriendly: true,
    blurb: "Guided kayak loop past the houseboats. Boats and life jackets included." }),
  e({ id: "e13", title: "Friday night food truck meet", category: "food", emoji: "🌮", host: "Rolling Plates", neighborhood: "Ballard", place: "Ballard Commons Park", lat: 47.6687, lng: -122.3842,
    start: "2026-10-23T17:30:00-07:00", end: "2026-10-23T20:30:00-07:00", cost: 12, capacity: 200, going: 64, beginnerFriendly: true, recurring: "every Friday",
    blurb: "Six trucks, long communal tables, and a playlist anyone can add to." }),
  e({ id: "e14", title: "Climbing intro night", category: "sports", emoji: "🧗", host: "Send It Social", neighborhood: "Fremont", place: "Fremont climbing gym (sample)", lat: 47.6490, lng: -122.3500,
    start: "2026-10-23T19:00:00-07:00", end: "2026-10-23T21:00:00-07:00", cost: 18, capacity: 20, going: 13, beginnerFriendly: true,
    blurb: "Gear and a belay lesson included. You'll be paired with a climbing buddy." }),
  e({ id: "e15", title: "Saturday market volunteer shift", category: "community", emoji: "🌻", host: "Neighbors Feeding Neighbors", neighborhood: "U District", place: "University Way farmers market", lat: 47.6655, lng: -122.3130,
    start: "2026-10-24T09:00:00-07:00", end: "2026-10-24T12:00:00-07:00", cost: 0, capacity: 15, going: 7, beginnerFriendly: true, recurring: "every Saturday",
    blurb: "Help collect and sort surplus produce for local food banks. Snacks on us." }),
  e({ id: "e16", title: "Gas Works kite flying", category: "outdoors", emoji: "🪁", host: "Wind & Wonder", neighborhood: "Wallingford", place: "Gas Works Park hill", lat: 47.6456, lng: -122.3344,
    start: "2026-10-24T11:00:00-07:00", end: "2026-10-24T13:00:00-07:00", cost: 0, capacity: 80, going: 31, beginnerFriendly: true,
    blurb: "Bring a kite or borrow one. Best wind is on top of the hill." }),
  e({ id: "e17", title: "Open-water swim (wetsuits)", category: "swim", emoji: "🌊", host: "Sound Swimmers", neighborhood: "West Seattle", place: "Alki Beach", lat: 47.5810, lng: -122.4070,
    start: "2026-10-24T08:00:00-07:00", end: "2026-10-24T09:30:00-07:00", cost: 0, capacity: 30, going: 18, beginnerFriendly: false, recurring: "every Saturday",
    blurb: "Buddy system, kayak spotter, hot drinks after. Wetsuit strongly recommended in October." }),
  e({ id: "e18", title: "Matcha pop-up + journaling", category: "cafe", emoji: "🍵", host: "Slow Morning pop-up", neighborhood: "Fremont", place: "Fremont Sunday market lot", lat: 47.6505, lng: -122.3500,
    start: "2026-10-24T10:00:00-07:00", end: "2026-10-24T12:00:00-07:00", cost: 7, capacity: 25, going: 12, beginnerFriendly: true,
    blurb: "Whisked-to-order matcha and a shared table with journaling prompts." }),
  e({ id: "e19", title: "Pickup basketball", category: "sports", emoji: "🏀", host: "Cal Anderson Hoops", neighborhood: "Capitol Hill", place: "Cal Anderson Park court", lat: 47.6165, lng: -122.3185,
    start: "2026-10-24T14:00:00-07:00", end: "2026-10-24T16:00:00-07:00", cost: 0, capacity: 20, going: 14, beginnerFriendly: false, recurring: "every Saturday",
    blurb: "Run fives, winners stay. All skill levels show up, games stay friendly." }),
  e({ id: "e20", title: "Bellevue lakeside yoga", category: "wellness", emoji: "🧘", host: "Flow Outside", neighborhood: "Bellevue", place: "Meydenbauer Bay Park", lat: 47.6145, lng: -122.2080,
    start: "2026-10-24T09:30:00-07:00", end: "2026-10-24T10:30:00-07:00", cost: 10, capacity: 30, going: 17, beginnerFriendly: true, recurring: "every Saturday",
    blurb: "Gentle all-levels flow on the lawn. Mats available to borrow." }),
  e({ id: "e21", title: "Redmond trail bike ride", category: "outdoors", emoji: "🚲", host: "Eastside Spokes", neighborhood: "Redmond", place: "Marymoor Park", lat: 47.6620, lng: -122.1210,
    start: "2026-10-18T10:00:00-07:00", end: "2026-10-18T12:00:00-07:00", cost: 0, capacity: 30, going: 12, beginnerFriendly: true,
    blurb: "Casual 15-mile out-and-back on the Sammamish River Trail. Coffee stop halfway." }),
  e({ id: "e22", title: "Late-night ramen pop-up", category: "food", emoji: "🍜", host: "Midnight Noodle", neighborhood: "Capitol Hill", place: "Pike/Pine pop-up space", lat: 47.6140, lng: -122.3200,
    start: "2026-10-24T21:00:00-07:00", end: "2026-10-24T23:30:00-07:00", cost: 14, capacity: 30, going: 27, beginnerFriendly: true,
    blurb: "One bowl, one night. Counter seating means you'll end up talking to your neighbor." }),
];

/** Neighborhood centers used to place a user from a quick text answer. */
export const AREAS: Record<string, { lat: number; lng: number; label: string }> = {
  "capitol hill": { lat: 47.6253, lng: -122.3222, label: "Capitol Hill" },
  "u district": { lat: 47.6615, lng: -122.3130, label: "U District" },
  "udistrict": { lat: 47.6615, lng: -122.3130, label: "U District" },
  "uw": { lat: 47.6553, lng: -122.3035, label: "UW" },
  "ballard": { lat: 47.6687, lng: -122.3840, label: "Ballard" },
  "fremont": { lat: 47.6510, lng: -122.3500, label: "Fremont" },
  "wallingford": { lat: 47.6615, lng: -122.3340, label: "Wallingford" },
  "green lake": { lat: 47.6800, lng: -122.3290, label: "Green Lake" },
  "queen anne": { lat: 47.6370, lng: -122.3570, label: "Queen Anne" },
  "downtown": { lat: 47.6062, lng: -122.3321, label: "Downtown" },
  "south lake union": { lat: 47.6256, lng: -122.3344, label: "South Lake Union" },
  "slu": { lat: 47.6256, lng: -122.3344, label: "South Lake Union" },
  "west seattle": { lat: 47.5700, lng: -122.3860, label: "West Seattle" },
  "bellevue": { lat: 47.6101, lng: -122.2015, label: "Bellevue" },
  "redmond": { lat: 47.6740, lng: -122.1215, label: "Redmond" },
  "kirkland": { lat: 47.6769, lng: -122.2060, label: "Kirkland" },
};
