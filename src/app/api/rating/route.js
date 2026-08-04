import connectDB from "@/lib/mongodb"
import Rating from "@/models/Rating"
import User from "@/models/User"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()

        const body = await request.json()
        const { rating, comment } = body
        const userId = session.user.id

        if (typeof rating !== "number" || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: "Invalid rating data" },
                { status: 400 }
            )
        }

        const existing = await Rating.findOne({ user: userId }).select('_id').lean()

        if (existing) {
            await Rating.updateOne(
                { user: userId },
                { $set: { rating, comment } }
            )
            const ratingDoc = await Rating.findOne({ user: userId })
                .select("rating comment createdAt -_id")
                .lean()
            return NextResponse.json({ ratingDoc }, { status: 200 })
        } else {
            const newDoc = await Rating.create({ user: userId, rating, comment })
            const ratingDoc = {
                rating: newDoc.rating,
                comment: newDoc.comment,
                createdAt: newDoc.createdAt
            }
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

    if (check) {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id || (userId && session.user.id !== userId)) {
            return NextResponse.json({ eligible: false, error: "Unauthorized" }, { status: 401 })
        }

        const authenticatedUserId = session.user.id

        try {
            const user = await User.findById(authenticatedUserId).select('email').lean();
            if (!user) {
                return NextResponse.json({ eligible: false, error: "User not found" })
            }

            const DailyActiveUser = await import("@/models/DailyActiveUser").then(mod => mod.default)

            const activeDates = await DailyActiveUser.distinct('date', {
                'users.email': user.email
            });
            const activeDays = activeDates.length;

            const hasRated = await Rating.exists({ user: authenticatedUserId })

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

    const rawRatings = await Rating.find()
        .select("rating comment createdAt")
        .populate("user", "name image -_id")
        .lean()

    const ratings = rawRatings.map(r => ({
        rating: r.rating,
        comment: r.comment || "",
        user: {
            name: r.user?.name || "Anonymous Listener",
            image: r.user?.image || null
        },
        createdAt: r.createdAt
    }))

    return NextResponse.json({ ratings })
}
