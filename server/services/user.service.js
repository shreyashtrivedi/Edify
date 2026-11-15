/**
 * User profiles. The frontend calls syncProfile() once after each login.
 */
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { User } from '../models/User.js';

/** Creates the profile on first login, updates it on later logins (an "upsert"). */
export async function syncProfile(auth0Id, profile) {
  const user = await User.findOneAndUpdate(
    { auth0Id },
    { $set: { ...profile, lastLoginAt: new Date() } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).lean();

  return { ...user, stats: await getStats(auth0Id) };
}

export async function getProfile(auth0Id) {
  const user = await User.findOne({ auth0Id }).lean();
  return { ...(user ?? { auth0Id }), stats: await getStats(auth0Id) };
}

/** Activity counters shown on the profile. */
async function getStats(auth0Id) {
  const courseIds = await Course.find({ creator: auth0Id }).distinct('_id');
  const lessonsGenerated = await Lesson.countDocuments({
    course: { $in: courseIds },
    isEnriched: true,
  });
  return { courses: courseIds.length, lessonsGenerated };
}
