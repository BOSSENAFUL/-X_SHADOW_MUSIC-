"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

const AppRating = () => {
    const { data: session } = useSession()
    const [isOpen, setIsOpen] = useState(false)
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasChecked, setHasChecked] = useState(false)

    useEffect(() => {
        const checkEligibility = async () => {
            if (session?.user?.id && !hasChecked) {
                try {
                    const res = await fetch(`/api/rating?check=true&userId=${session.user.id}`)
                    const data = await res.json()

                    if (data.eligible) {
                        setIsOpen(true)
                    }
                    setHasChecked(true)
                } catch (error) {
                    console.error("Failed to check rating eligibility", error)
                }
            }
        }

        checkEligibility()
    }, [session, hasChecked])

    const handleSubmit = async () => {
        if (rating === 0) return

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session.user.id,
                    rating,
                    comment
                })
            })

            if (res.ok) {
                setIsOpen(false)
                toast.success("Thank you for your feedback!")
            } else {
                toast.error("Something went wrong. Please try again.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to submit rating")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!session) return null

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Enjoying Jammify?</DialogTitle>
                    <DialogDescription>
                        We'd love to hear your thoughts! Please rate your experience.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex justify-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-8 h-8 cursor-pointer transition-all duration-200 hover:scale-115 ${rating >= star ? "fill-amber-400 text-amber-400" : "text-muted/30"}`}
                                onClick={() => setRating(star)}
                            />
                        ))}
                    </div>
                    <Textarea
                        placeholder="Tell us more about your experience (optional)..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Maybe Later</Button>
                    <Button onClick={handleSubmit} disabled={rating === 0 || isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default AppRating
