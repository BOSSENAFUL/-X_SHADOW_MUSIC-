import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const FEATURED_PODCASTS = [
  {
    id: "shonengrowth",
    title: "Shonen Growth",
    playlistId: "UUcnnDVTNBGQ7ZS0U9X12MUQ",
    publisher: "Shonen Growth",
    coverImage: "https://yt3.ggpht.com/UbZUAtnbCQo596f1GQSqRUdANw3wsxkihXIEba2mjrK85rEOyFaPomQ-Y8nWmfx4lMRSggET_g=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "venus-amvs",
    title: "Venus amvs ",
    playlistId: "UUZXw3k20ys4oOnLcb9FzPnw",
    publisher: "Venus amvs ",
    coverImage: "https://yt3.ggpht.com/ON3tUJAGYKMEmXYj1-cYPRzDDNPzOzcNyJHEf3nizOvk_Pz7NpCwmnJItZ8RSVLpfedfGbAlKwI=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "inspirewithinn",
    title: "Inspire Within",
    playlistId: "UUMV9uC1MAYGKBYFZldfSc3g",
    publisher: "Inspire Within",
    coverImage: "https://yt3.ggpht.com/AX3q_QvveXLRpEDDM6RB1AqoQrQjFUlFM89wzutvehAdx7Go55TrvwWMspuP930EprH_MRxkJQ=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "jayshettypodcast",
    title: "Jay Shetty Podcast",
    playlistId: "UUbk_QsfaFZG6PdQeCvaYXJQ",
    publisher: "Jay Shetty Podcast",
    coverImage: "https://yt3.ggpht.com/FPk4BUkb_OaCmCW7oiBaFWo4e25JqPV5mMWq3GMIGRBKikyGasog1d49He-fu16BlB5oSpXWaA=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "mindsetmentorpodcast",
    title: "The Mindset Mentor Podcast",
    playlistId: "UUHl3aFKS0bY0d8JwqNysaeA",
    publisher: "The Mindset Mentor Podcast",
    coverImage: "https://yt3.ggpht.com/wqGVrRE5bYFrUwtbDO9lMQGqUBDuZoic_Jfe4UkWztdLWNjwm4RkMFMAj4u-NkkhaKf8yrNN16k=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "anythinggoeswithemma",
    title: "anything goes with emma chamberlain",
    playlistId: "UUJvR4zNAPRJoMDF3A912dBA",
    publisher: "anything goes with emma chamberlain",
    coverImage: "https://yt3.ggpht.com/Zwj7BYEHC6jvJ8tKQhnWuwVR0rTNKxBR-XDZpRxsr97cuveO2ZQKZlyfh90sD7m25KDnwGXX=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "melrobbins",
    title: "Mel Robbins",
    playlistId: "UUk2U-Oqn7RXf-ydPqfSxG5g",
    publisher: "Mel Robbins",
    coverImage: "https://yt3.ggpht.com/0k8TKNmLHIMquCtAvJPHB8u1Uy1vzb89aYghWZY8CRtKOkfMVmTBlUXvW2GoA3nTpVnputYuJw=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "theglowupsecretspodcast",
    title: "The Glow Up Secrets Podcast",
    playlistId: "UUN6-VZsIikHvr_B0TG72x_A",
    publisher: "The Glow Up Secrets Podcast",
    coverImage: "https://yt3.ggpht.com/eI4UF7y6uhwBGWbpInLKcDthdZH2CYby1aUQZ8mxysNCitFwYGsU_O02M-Hcjc1XweKNgZWIsQ=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "thebalancetheorypodcast",
    title: "The Balance Theory Podcast",
    playlistId: "UUVobORsiSuq-9eW7rZPBxxQ",
    publisher: "The Balance Theory Podcast",
    coverImage: "https://yt3.ggpht.com/Zl7csAtTfsqTyJX8OQvEaLRhYBHeUMy87sHat6vnOGeEJchkrh9piaISR6I7lWhCarmeHLKDNJY=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "adultingwithjoycepring",
    title: "Joyce Pring",
    playlistId: "UU96QOiKwuV7fqoazF_Ttk7g",
    publisher: "Joyce Pring",
    coverImage: "https://yt3.ggpht.com/QHEEvKfkex1FgZUPh-xzge_kZXSd7wFsj-_G8-Cm3BQlT1SkyNXjYQ-3BQ5wz0Y2s0cLm37eXNI=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "motivation2study",
    title: "Motivation2Study",
    playlistId: "UU8PICQUP0a_HsrA9S4IIgWw",
    publisher: "Motivation2Study",
    coverImage: "https://yt3.googleusercontent.com/ytc/AIdro_m8DuO0qNak58a-KpeERBOx8IuZvbZn6cjL33JUi6Te0p4=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "richroll",
    title: "Rich Roll",
    playlistId: "UUpjlh0e319ksmoOD7bQFSiw",
    publisher: "Rich Roll",
    coverImage: "https://yt3.ggpht.com/jxEUmMN_uRj8Vlm83Xddqy85TIcKx9XLk9YomW4vNO20jCRnZpEJIsWNc5DFytaXJc6STO__dg=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "leilahormozi",
    title: "Leila Hormozi",
    playlistId: "UUxCcu9pet4dljrBLf8R5nwA",
    publisher: "Leila Hormozi",
    coverImage: "https://yt3.ggpht.com/kW3IBBCqYDJwnML9rubaYEZZsxQ0SFmSXPNj5lHyHbQ8IYuRyevOwVXvVAfoq71FdI7HTHicxA=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "markmanson",
    title: "Mark Manson",
    playlistId: "UU0TnW9acNxqeojxXDMbohcA",
    publisher: "Mark Manson",
    coverImage: "https://yt3.ggpht.com/y9WvbRhG1UEK8O0KSuD7-JIPKpsKHRIyo_dJk5CXp4woqgsgf3Z8eb9L9i-r4de1-KTRJL_Evg=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "psych2go",
    title: "Psych2Go",
    playlistId: "UUkJEpR7JmS36tajD34Gp4VA",
    publisher: "Psych2Go",
    coverImage: "https://yt3.ggpht.com/PABMv0Tbz1G47ZIdC87y7KgSJ3IyehptRBY9jfp3BZbsP8TRnslVdjFYG0mjtls2U5-1LyeofA=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "mattdavella",
    title: "Matt D'Avella",
    playlistId: "UUJ24N4O0bP7LGLBDvye7oCA",
    publisher: "Matt D'Avella",
    coverImage: "https://yt3.ggpht.com/Ldpkcur-En5Qn8rcowaWiU6xbNt_yMrs1mAVcSRBIOdq0tSyTmGGIALRcgfm1a8aGKgYiYDEIQ=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Self-help"
  },
  {
    id: "chainsfr",
    title: "ChainsFR On Spotify",
    playlistId: "PLrALiQpz2JiqPV3-U76_vFiVvKJJanZEt",
    publisher: "ChainsFR",
    coverImage: "https://yt3.ggpht.com/686kDYeB0x2_SDNwLgmvDG4Tk-64i9ImBn35FMSLDnH_86isLB2XpJzDw4RKfrcT9FBcq59DfwU=s300-c-k-c0x00ffffff-no-rj",
    category: "Comedy"
  },
  {
    id: "distractible",
    title: "Distractible",
    playlistId: "PLEKVU3qCoLrLaYsYunJyyeJkamI0NdRnf",
    publisher: "Distractible",
    coverImage: "https://yt3.ggpht.com/ytc/AIdro_lLaqM1F2uc0ffhgfSziLhzdEKDyQaO-JK3j6PVRnJCzwI=s300-c-k-c0x00ffffff-no-rj",
    category: "Comedy"
  },
  {
    id: "samayrainaofficial",
    title: "Samay Raina",
    playlistId: "UUAov2BBv1ZJav0c_yHEciAw",
    publisher: "Samay Raina",
    coverImage: "https://yt3.googleusercontent.com/Wa_kc-EY0nzEj6c54uxm4kHnoNEpAdfM_Gd3QOgT-eLBohn0QiL6KRDdn5uWmF1nBhJty5y4=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "badfriends",
    title: "Bad Friends",
    playlistId: "UURBpynZV0b7ww2XMCfC17qg",
    publisher: "Bad Friends",
    coverImage: "https://yt3.googleusercontent.com/ytc/AIdro_mj6DSYaOAuu8QgB4Hv955P4Ua3BYJdnBd2ayCHasSnA_o=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "theovon",
    title: "Theo Von",
    playlistId: "UU5AQEUAwCh1sGDvkQtkDWUQ",
    publisher: "Theo Von",
    coverImage: "https://yt3.googleusercontent.com/ytc/AIdro_k6UKS6KWK5qYyoipdDAfb8ayhKQiQUJmDAQR5rNGASXTc=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "mssecretpod",
    title: "Matt and Shane's Secret Podcast",
    playlistId: "UU4fZeoNxAXfbIpT3swsVh9w",
    publisher: "Matt and Shane's Secret Podcast",
    coverImage: "https://yt3.googleusercontent.com/ytc/AIdro_nQQiVMnfosIHWZoU_nFiW4nM1_4S4W7CQt9HobS83rXg=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "smartless",
    title: "SmartLess",
    playlistId: "UU-W8Qu2Zb407kjVhW-5U-SA",
    publisher: "SmartLess",
    coverImage: "https://yt3.googleusercontent.com/4o4XBb3lpQe6bTpVlm-HO8kihdHzGJEyhbuoBonl0vrfJ8YENNo6G_N8CFjlqqYQmeIthThjqqU=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "areyougarbage",
    title: "AreYouGarbage? Comedy Podcast",
    playlistId: "UUaPOHjHoCbbnxZLHu9wgRRw",
    publisher: "AreYouGarbage? Comedy Podcast",
    coverImage: "https://yt3.googleusercontent.com/ytc/AIdro_lDNfqsfzmvLCcdM3czLtuiZudBuLqaZ02ovdx_rD5t5g=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "ymhstudios",
    title: "YMH Studios",
    playlistId: "UUYIgiXwJck_Pb5Nj-wIrsqg",
    publisher: "YMH Studios",
    coverImage: "https://yt3.googleusercontent.com/rDpAsf6lU0mg9DCsL4ItbdVaOwagEXovoQjqKHCmNs1ERLHP7R3vaezZ3nsMotUUWJczu8h1G9U=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "killtony",
    title: "Kill Tony",
    playlistId: "UUwzCMiicL-hBUzyjWiJaseg",
    publisher: "Kill Tony",
    coverImage: "https://yt3.googleusercontent.com/yYCb9lJvgo8oN-Grl2z8yICUNN9avkujrD1XC-CqdNzLuDicUPw52W1BC3H5bMvzSsHy5JJA7Q=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "thealwayssunnypodcast",
    title: "The Always Sunny Podcast",
    playlistId: "UUBw0bL8MtOIl1UX7db2MT3A",
    publisher: "The Always Sunny Podcast",
    coverImage: "https://yt3.googleusercontent.com/3x_bQVRDhqMt5vc3kBEYMDeq8VDXxTmUH9NrZK1ESbuG8a_OhSoQY3RH3C8_1TPQCTDQEh8KBA=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "wemightbedrunkpod",
    title: "We Might Be Drunk Podcast",
    playlistId: "UUy6A9WMN43DrtBkID7nMXJw",
    publisher: "We Might Be Drunk Podcast",
    coverImage: "https://yt3.googleusercontent.com/fTlp3tOa6LEh9LAIUs0XexZoA9wtTLRUifUBEZmUiTuWk5hc7Bcc41nkZRxKtnRBAGyULBtVCQ=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "joerogan",
    title: "PowerfulJRE",
    playlistId: "UUzQUP1qoWDoEbmsQxvdjxgQ",
    publisher: "PowerfulJRE",
    coverImage: "https://yt3.googleusercontent.com/ytc/AIdro_kIOv8XSayB3mVzdmGH6r6nOuncclc_QxWr7TYTXM4dFrs=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "teamcoco",
    title: "Team Coco",
    playlistId: "UUi7GJNg51C3jgmYTUwqoUXA",
    publisher: "Team Coco",
    coverImage: "https://yt3.googleusercontent.com/B3EaVhMFIewHYNbLd6NCkunUfxEYIvlbz6MUjQkFacFzpFevaRTB8cAGCFooCuBv4oyCE3ur=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "theadamfriedlandshow",
    title: "The Adam Friedland Show",
    playlistId: "UU6ext5UAbrLT2e5y5BC6RTQ",
    publisher: "The Adam Friedland Show",
    coverImage: "https://yt3.googleusercontent.com/0nW89FuRRZ2KVLFuotsQzgPZ4ksbOKMC4snCvmueKRVxFu115O6tjE1QaSopVsxcBC8jU_nmINI=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "gigglysquad",
    title: "Giggly Squad",
    playlistId: "UU2kMTY7QDxX98YVZdr32uCA",
    publisher: "Giggly Squad",
    coverImage: "https://yt3.googleusercontent.com/u7h7Gr_idPFApJDsuRWjgEtMBJDgmAP8UDtes3_R7b2uWddPlPg_DPB99up4H_yJ-G3YIl5p=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "thebasementyard",
    title: "The Basement Yard",
    playlistId: "UU_a6c3KLo9reMOqn2pbvMqg",
    publisher: "The Basement Yard",
    coverImage: "https://yt3.googleusercontent.com/G_8mTrsKgK_67I1ITvjrAIBhnt5OlJite_aiwXguAfnFTjv9KSY8icUKlnObw_MSlg1R9enMIg=s176-c-k-c0x00ffffff-no-rj-mo",
    category: "Comedy"
  },
  {
    id: "trust-me-bro",
    title: "Trust Me Bro",
    playlistId: "PLntZx10gIeP_APgYReMvJZEXtfMQFUwvj",
    publisher: "Trust Me Bro",
    coverImage: "https://yt3.ggpht.com/J-IG-qr1738moaE3-5rIJrUN7atTa14MMuq00f424TiSOapsu2KYmaxa102PmkkdgJRlSRoGRQ=s300-c-k-c0x00ffffff-no-rj",
    category: "Culture"
  },
  {
    id: "trash-taste",
    title: "Trash Taste Podcast",
    playlistId: "PLhSOKdNAueDi5m-0FnJnyNwpwHRDMmZD-",
    publisher: "Trash Taste Podcast",
    coverImage: "https://yt3.ggpht.com/Lx60Qx4B_x42KQN_MsfN919-TNSocs82NcaLbFOpYg2l00uumVEe18R50e36m--bTM1gZqyW=s300-c-k-c0x00ffffff-no-rj",
    category: "Culture"
  },
  {
    id: "weekly-motivation",
    title: "Weekly Motivation by Ben Lionel Scott",
    playlistId: "PLUKRqQ8cSB-DCDuEl5vYogIMH9ph-7OP7",
    publisher: "Ben Lionel Scott",
    coverImage: "https://yt3.ggpht.com/oZpgc4gYfYe04tWJ8KXJ9vmJOelGUkmhQ1pcfB3wKMraDRZZrC6u8MIQ4Wpfx09iejiP9_qksQ=s300-c-k-c0x00ffffff-no-rj",
    category: "Educational"
  },
  {
    id: "figuring-out",
    title: "Raj Shamani's Figuring Out",
    playlistId: "PLE0Jo6NF_JYO5-phess8GKafKMtPv3tfZ",
    publisher: "Raj Shamani",
    coverImage: "https://yt3.ggpht.com/qSVJkhoSs6lw5cNMsZAJ8ZAk1pxiewDb_gLtnzOsyM5TWQ6YggQj0eBetOLSxFuJqgxsyQ73NA=s300-c-k-c0x00ffffff-no-rj",
    category: "Educational"
  },
  {
    id: "mindset-meditation",
    title: "The Mindset Meditation Podcast",
    playlistId: "PL1A9PtiQ9-0aghMylLfVr7VJb_6oiVyLb",
    publisher: "The Mindset Meditation",
    coverImage: "https://yt3.ggpht.com/ytc/AIdro_nZRMsViPWfXPrPN0W5yVK4H8c5pA61LlBnzejQe7J69w=s300-c-k-c0x00ffffff-no-rj",
    category: "Health"
  },
  {
    id: "at-podcast",
    title: "AT Podcast",
    playlistId: "PLJCN_QpBlsx0C2CH6vSmTlXPc8BV6p7D6",
    publisher: "AT Podcast",
    coverImage: "https://yt3.ggpht.com/ytc/AIdro_m0t6ZoIa9bquNvoyyn0puAo6vQ8iD3sTzg157Z5R2_eA=s300-c-k-c0x00ffffff-no-rj",
    category: "Health"
  },
  {
    id: "mrballen",
    title: "MrBallen Podcast: Strange, Dark & Mysterious Stories",
    playlistId: "PLwkErjXcu8sdxHNHpCz1X4jqzXNIteEsK",
    publisher: "MrBallen",
    coverImage: "https://yt3.ggpht.com/7IMeHG-MWgub5kfDhxojNIsALyrJM7HPx6BynZGK0qJxHEoZCGPliK8E8hnAbbSutQgg-rBA=s300-c-k-c0x00ffffff-no-rj",
    category: "True crime"
  },
  {
    id: "true-story-rwj",
    title: "True Story Podcast Ray William Johnson",
    playlistId: "PLGaLdaA1FatjJwJUSABAVMdQ9x8EarxMD",
    publisher: "True Story Podcast",
    coverImage: "https://yt3.ggpht.com/_3FFtFHy1FkkDaZk_5pO6Mxtr7XZ4bEuooGIyCZWP2HHK8aaoVUDR8g5yIvpmNA7OGnkEjlP6Q=s300-c-k-c0x00ffffff-no-rj",
    category: "True crime"
  }
];

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ success: true, results: FEATURED_PODCASTS });
  } catch (error) {
    console.error('Error in /api/youtube/featured:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
