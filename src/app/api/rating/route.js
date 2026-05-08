import connectDB from "@/lib/mongodb"
import Rating from "@/models/Rating"
import User from "@/models/User"
import { NextResponse } from "next/server"

export async function POST(request) {
    try {
        await connectDB()

        const body = await request.json()
        const { rating, comment, userId } = body

        if (!userId || typeof rating !== "number" || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: "Invalid rating data" },
                { status: 400 }
            )
        }

        const existing = await Rating.findOne({ user: userId }).select('_id').lean()

        if (existing) {
            // Targeted update — only writes changed fields, no full document rewrite
            await Rating.updateOne(
                { user: userId },
                { $set: { rating, comment } }
            )
            const ratingDoc = await Rating.findOne({ user: userId }).lean()
            return NextResponse.json({ ratingDoc }, { status: 200 })
        } else {
            const ratingDoc = await Rating.create({ user: userId, rating, comment })
            return NextResponse.json({ ratingDoc }, { status: 201 })
        }
    } catch (error) {
        console.error("Error submitting rating:", error)
        return NextResponse.json(
            { error: "Failed to submit rating" },
            { status: 500 }
        )
    }
}

export async function GET(request) {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const check = searchParams.get("check")
    const userId = searchParams.get("userId")

    if (check && userId) {
        try {
            const user = await User.findById(userId).select('email').lean();
            if (!user) {
                return NextResponse.json({ eligible: false, error: "User not found" })
            }

            const DailyActiveUser = await import("@/models/DailyActiveUser").then(mod => mod.default)

            // Count distinct days the user has been active.
            // Use the compound index { date: 1, 'users.email': 1 } efficiently by
            // doing a distinct on 'date' filtered by the user's email — much faster
            // than countDocuments which scans every document's users array.
            const activeDates = await DailyActiveUser.distinct('date', {
                'users.email': user.email
            });
            const activeDays = activeDates.length;

            const hasRated = await Rating.exists({ user: userId })

            const eligible = activeDays > 4 && !hasRated

            return NextResponse.json({
                eligible,
                activeDays,
                hasRated: !!hasRated
            })
        } catch (error) {
            console.error("Error checking rating eligibility:", error)
            return NextResponse.json({ eligible: false, error: "Internal Error" }, { status: 500 })
        }
    }

    const ratings = await Rating.find()
        .populate("user", "name image")
        .lean()

    return NextResponse.json({ ratings })
}
