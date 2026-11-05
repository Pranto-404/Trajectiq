// Bengali strings. Keys are the English source text (the same convention as the v6 UI_BN table), so a missing key
// simply renders the English text. The first block is the v6 table verbatim; the second block covers the new shell,
// design system and store messages. Add keys here (or in a feature's own dictionary via registerStrings).
export const LEGACY_BN = {
  'Play mission': 'মিশন খেলুন', 'Mission brief': 'মিশনের লক্ষ্য', 'Engineering lab': 'প্রকৌশল ল্যাব', 'Readiness review': 'উৎক্ষেপণের প্রস্তুতি', 'Telemetry detail': 'মিশনের তথ্য', 'Causal debrief': 'ফলাফলের কারণ', 'Trade space': 'ফল তুলনা', 'Sources & method': 'তথ্যসূত্র ও পদ্ধতি',
  'Ask mission assistant': 'সহকারীকে জিজ্ঞেস করুন', 'Ask assistant': 'সহকারী', 'How to play': 'খেলার নিয়ম', 'Customize': 'নিজের মতো সাজান', 'Sources': 'তথ্যসূত্র', 'Close': 'বন্ধ করুন', 'Cancel': 'বাতিল', 'Keep flight': 'মিশন রাখুন', 'Discard and continue': 'মিশন মুছে এগোন',
  'Review paused flight': 'সংরক্ষিত মিশন দেখুন', 'Discard saved flight': 'সংরক্ষিত মিশন মুছুন', 'Discard the active flight?': 'চলমান মিশন মুছে ফেলবেন?',
  'Hardware is locked. Finish or explicitly discard this flight first.': 'মিশনের যন্ত্রাংশ লক করা। আগে মিশন শেষ করুন অথবা মুছে দিন।',
  'Your paused flight is saved in this browser. Cancel keeps it. Discard permanently removes this unfinished run and continues.': 'থামানো মিশন এই ব্রাউজারে সংরক্ষিত আছে। বাতিল করলে থাকবে; মুছে এগোলে চলমান মিশন হারাবে।',
  'Resume your saved mission?': 'সংরক্ষিত মিশনে ফিরে যাবেন?', 'It stays paused until you press Resume. Browser storage is local to this device.': 'আবার চালু না করা পর্যন্ত মিশন থেমে থাকবে। সংরক্ষণ শুধু এই ডিভাইসের ব্রাউজারে।',
  'Accept mission · enter hangar': 'মিশন গ্রহণ · যন্ত্রাংশ বাছাই', 'Launch readiness →': 'উৎক্ষেপণের প্রস্তুতি →', 'Authorize launch · enter flight →': 'উৎক্ষেপণ অনুমোদন →', 'Authorize launch ↗': 'উৎক্ষেপণ অনুমোদন ↗',
  'Ⅱ Pause': 'Ⅱ থামান', '▶ Resume': '▶ আবার চালান', 'Next event ⇥': 'পরের ঘটনা ⇥', '+5 min / next phase': '+৫ মিনিট / পরের ধাপ', 'Balanced build': 'ভারসাম্যপূর্ণ নকশা', 'High-science challenge': 'বেশি বিজ্ঞানের চ্যালেঞ্জ', 'Engineering detail': 'প্রকৌশল বিস্তারিত',
  'Redesign & play again →': 'নকশা বদলে আবার খেলুন →', 'Map in sunlight': 'রোদে পর্যবেক্ষণ', 'Map through shadow': 'অন্ধকারেও পর্যবেক্ষণ', 'Conserve energy': 'শক্তি সংরক্ষণ', 'Return priority': 'তথ্য ফেরত পাঠান', 'Hide tips': 'নির্দেশনা লুকান', 'Discard / new mission': 'মিশন মুছে নতুন শুরু'
};

export const SHELL_BN = {
  // shell and navigation
  'Skip to content': 'মূল অংশে যান', 'Board': 'মিশন বোর্ড', 'Hangar': 'যন্ত্রাংশ ঘর', 'Flight': 'উড্ডয়ন', 'Report': 'ফলাফল', 'Mission screens': 'মিশনের ধাপ', 'Menu': 'মেনু', 'Assistant': 'সহকারী', 'Language': 'ভাষা',
  'Sound': 'শব্দ', 'Sound on': 'শব্দ চালু', 'Sound off': 'শব্দ বন্ধ', 'Haptics': 'কম্পন', 'Vibration': 'কম্পন', 'Reduce animation': 'অ্যানিমেশন কমান', 'Reduced motion': 'কম অ্যানিমেশন', 'Guided tips': 'নির্দেশনা', 'Switch language': 'ভাষা বদলান',
  // buttons and states
  'Hold to confirm': 'ধরে রেখে নিশ্চিত করুন', 'Press again to confirm': 'নিশ্চিত করতে আবার চাপুন', 'Confirmed': 'নিশ্চিত হয়েছে', 'Loading': 'লোড হচ্ছে', 'Dismiss': 'সরিয়ে দিন', 'Back': 'পিছনে', 'Next': 'পরের', 'Done': 'শেষ', 'Apply': 'প্রয়োগ করুন',
  'Installed': 'বসানো হয়েছে', 'Install': 'বসান', 'Locked': 'লক করা', 'Selected': 'বাছাই করা', 'Preview': 'প্রিভিউ',
  // status chips
  'PASS': 'ঠিক আছে', 'WARN': 'সতর্কতা', 'FAIL': 'ব্যর্থ', 'INFO': 'তথ্য', 'GO': 'যাও', 'NO-GO': 'থামো',
  // phases
  'Brief': 'সংক্ষিপ্ত বিবরণ', 'Architecture': 'কাঠামো', 'Readiness': 'প্রস্তুতি', 'Launch': 'উৎক্ষেপণ', 'Transfer': 'যাত্রাপথ', 'Capture': 'কক্ষপথে প্রবেশ', 'Operations': 'পরিচালনা', 'Debrief': 'পর্যালোচনা',
  // store messages
  'Decision required': 'সিদ্ধান্ত প্রয়োজন', 'Simulation paused.': 'সিমুলেশন থেমে আছে।', 'Camera reset.': 'ক্যামেরা আগের অবস্থায় ফিরেছে।', 'Decision applied. Review your spacecraft, then Resume.': 'সিদ্ধান্ত প্রয়োগ হয়েছে। মহাকাশযান দেখে নিন, তারপর আবার চালান।',
  'Mission code copied.': 'মিশন কোড কপি হয়েছে।', 'Design code copied.': 'নকশার কোড কপি হয়েছে।', 'Challenge link copied.': 'চ্যালেঞ্জ লিংক কপি হয়েছে।', 'Select the code and copy it manually.': 'কোডটি বেছে নিয়ে নিজে কপি করুন।',
  'Browser storage unavailable. Export your mission report to keep it.': 'ব্রাউজারের সংরক্ষণ কাজ করছে না। মিশনের রিপোর্ট এক্সপোর্ট করে রাখুন।',
  'Saved flight needs attention': 'সংরক্ষিত মিশনে সমস্যা আছে', 'Download original save': 'মূল সংরক্ষণ ডাউনলোড করুন', 'Discard damaged save': 'নষ্ট সংরক্ষণ মুছুন', 'Discard invalid checkpoint': 'অকার্যকর চেকপয়েন্ট মুছুন',
  'Commit your design?': 'নকশা চূড়ান্ত করবেন?', 'Pre-launch check': 'উৎক্ষেপণের আগের পরীক্ষা', 'Back to hangar': 'যন্ত্রাংশ ঘরে ফিরুন'
};

export const BN = {...LEGACY_BN, ...SHELL_BN};
