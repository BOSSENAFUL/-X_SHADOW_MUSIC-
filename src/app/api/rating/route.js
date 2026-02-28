import connectDB from "@/lib/mongodb"
import Rating from "@/models/Rating"
import User from "@/models/User"
import { NextResponse } from "next/server"

export async function POST(request) {
    await connectDB()

    const body = await request.json()
    const { rating, comment, userId } = body

    if (!userId || typeof rating !== "number" || rating < 1 || rating > 5) {
        return NextResponse.json(
            { error: "Invalid rating data" },
            { status: 400 }
        )
    }

    let ratingDoc = await Rating.findOne({ user: userId })
    let isNew = false

    if (ratingDoc) {
        ratingDoc.rating = rating
        ratingDoc.comment = comment
        await ratingDoc.save()
    } else {
        ratingDoc = await Rating.create({ user: userId, rating, comment })
        isNew = true
    }

    return NextResponse.json(
        { ratingDoc },
        { status: isNew ? 201 : 200 }
    )
}

export async function GET(request) {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const check = searchParams.get("check")
    const userId = searchParams.get("userId")

    if (check && userId) {
        try {
            const user = await User.findById(userId)
            if (!user) {
                return NextResponse.json({ eligible: false, error: "User not found" })
            }

            const DailyActiveUser = await import("@/models/DailyActiveUser").then(mod => mod.default)

            // Count distinct days the user has been active
            // We count documents in DailyActiveUser where existing in users array
            const activeDays = await DailyActiveUser.countDocuments({
                "users.email": user.email
            })

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
