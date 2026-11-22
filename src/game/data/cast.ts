// The people of the valley, and what they have to say.
//
// Nobody here knows they are in a game. Lines are spoken in character; anything the player needs
// to be told about keys or commands goes in a hint ({ note }) or the help page, never in a mouth.
//
// Where everybody is depends on the fires. Until the Elder's hearth is lit the whole village is
// in the one room that has a fire (the inn); afterwards they go home. `thaw.home` is the thaw
// reaching Hollowmere, and `hall.thaw` the feast that is held for it.

import type { CharDef, Cond } from '../../engine/types';

const ask = (who: string, label: string, topic: string, when?: Cond[]): { label: string; say: string; if?: Cond[] } => ({ label, say: `ask ${who} about ${topic}`, ...(when ? { if: when } : {}) });

const LIT: Cond = { flag: 'hearth.lit' };
const COLD: Cond = { not: LIT };
const THAW: Cond = { flag: 'thaw.home' };
/** The woman with the ring came home by the coal, and Hollowmere knows it. */
const CAME: Cond[] = [{ flag: 'coal.given' }, THAW];

export const chars: Record<string, CharDef> = {
  sigga: {
    id: 'sigga',
    name: 'Sigga',
    nouns: ['sigga'],
    spec: { skin: 'skin', hair: 'brown', hairStyle: 'long', tunic: 'blue', legs: 'blue', boots: 'leather', dress: true, apron: 'cream', collar: 'cream' },
    look: 'A woman in three shawls, stamping her feet beside a board of dough: eleven loaves\' worth, gone hard and white as river stones. She is the only person out of doors in Hollowmere.',
    lookWhen: [
      { if: [THAW], look: 'A woman in a blue wool dress, down to one shawl, with flour to the elbows and bread to give away.' },
      { if: [LIT], look: 'A woman in a blue wool dress and two shawls, with flour on her apron and the look of somebody with an oven to get back to.' },
    ],
    talk: [
      { if: [{ flag: 'hall.feast' }], brief: true, say: `"Nine days I've made dough that wouldn't rise." Sigga has a loaf in each hand and has plainly forgotten which one was meant for you. "Tomorrow you'll not be able to cross the square for bread. Here. Take both."` },
      { if: [{ flag: 'hall.thaw' }], brief: true, say: `Sigga is cutting bread at the long table as fast as it is taken. She looks you up and down with great interest, as she did the first time. "Well, I know where you're from now," she says. "Sit down before you fall down."` },
      {
        if: [{ not: { flag: 'sigga.met' } }, COLD],
        say: `"I make it every morning," she says, before you have asked. "In case." She looks you up and down with great interest. "You're not from over the ridge, I'd know you. And you're not from Eldmark, nobody is, any more. Where are you from?"\n\nYou have no answer, and she does not seem to mind.\n\n"Well, it isn't here. Kettle and Helm, the one with the smoke. Everybody's there. There's nowhere else to be." She lowers her voice. "Don't stand between Halla and the fire."`,
        do: [{ set: 'sigga.met' }, { score: 1, id: 'sigga' }],
      },
      { if: [THAW], say: `"They're saying the winter broke because of you. I said: nonsense, winters break by themselves." Sigga hands you a loaf, still warm. "And then I baked you this, so you can see how much I believe it."`, do: [{ set: 'sigga.met' }, { heal: 15 }] },
      { if: [LIT], say: `"Thane." She tries the word for size, then grins. "There's bread again. Here. Don't argue."`, do: [{ set: 'sigga.met' }, { heal: 10 }] },
      { say: `"Still out here? So am I. Somebody has to mind the dough." She stamps her feet. "Go in, go in. The Kettle and Helm. The one with the smoke."` },
    ],
    topics: {
      elder: [
        { if: [LIT], say: `"She slept a day and a night in her chair, after. Nobody said so. Don't you say so either."` },
        { say: `"Marta Coldhand. Forty winters she's kept this village. She's sat nine days up in that hall with Odd's girl, and comes down once a day to count us. Don't ask her how the child is. Nobody does twice."` },
      ],
      tova: [
        { if: [LIT], say: `"Up, and eating, and telling everybody what things are called. She's renamed my oven."` },
        { say: `"Tova. Odd's girl, seven at harvest. She took the lung-cold at midwinter, the same night the fires went. Marta has her up at the hall." Sigga looks at her dough. "I baked her a little loaf of her own, the first morning. It's on the board with the rest."` },
      ],
      hall: [
        { if: [LIT], say: `"Warmest place in Hollowmere, again. You've a bed in it, I hear. Nobody's had a bed in that hall but an Elder since before my grandmother."` },
        { say: `"The Elder's hall. Marta's in there with the child, and has been since midwinter. It's colder in than out, they say. I've not been asked in."` },
      ],
      hearth: [
        { if: [LIT], say: `"Every one of them lit, and staying lit. I've stopped getting up in the night to look." She does not sound as if she has stopped.` },
        { say: `"Midwinter night. I'd banked mine, same as always, and I woke because the room had gone quiet. The fire had lain down. That's the only way I can say it: lain down, like a dog that's been told to. They all had."` },
      ],
      dough: [
        { if: [THAW], say: `"Bread every morning, and the oven never once sulking. I'd forgotten bread could be dull. I'm enjoying it enormously."` },
        { if: [LIT], say: `"There's bread again. I was up before the light. I shall be up before the light for the rest of my life, and I don't care."` },
        { say: `"Eleven loaves' worth, every morning. One for each roof. It's frozen on the board before I've done shaping it." She raps one with her knuckles, and it rings. "In case, I said. In case today is the day an oven stays lit. And it gives me somewhere to be that isn't that room."` },
      ],
      inn: [
        { if: [LIT], say: `"Halla slept a day and a night. Then she got up and scrubbed the whole inn, to get the smell of all of us out of it."` },
        { say: `"Halla's is the only fire that didn't go out, because Halla didn't let it. A stick at a time, for nine days. Everybody's in there in blankets, breathing each other's breath."` },
      ],
      well: [
        { if: [THAW], say: `"Running. I drew a bucket this morning and stood and looked at it like a fool."` },
        { say: `"Frozen solid, bucket and all. We melt snow, at Halla's fire, a pot at a time."` },
      ],
      village: `"Hollowmere. Eleven roofs, one well, and more goats than sense."`,
      eldmark: `"Three days off, when it was anywhere. Forty roofs, they had. It got too cold to keep forty. Some of them came through here going south, the year I was married, and didn't stop."`,
      weather: [
        { if: [THAW], say: `"There's a drip. Listen. That's the eaves. I'd forgotten eaves did that."` },
        { say: `"Every winter's colder than the one before. My mother said so, and I thought it was only what mothers say. Then I was a mother."` },
      ],
      work: [
        { if: [LIT], say: `"Marta has work for a Thane; she has work for everybody. And there are people out past the valley who'd pay for a strong arm, Halla says."` },
        { say: `"Work? There's no work. There's keeping warm." She considers you. "Marta will find you something. She finds everybody something."` },
      ],
      name: `"Sigga. I bake, when there's a fire to bake with."`,
      tree: `"Stay on the path in the pinewood. The trees are the least of what's in there."`,
      wolf: `"They've come down out of the high wood, bolder every week. Toke hunted them, till one took a piece of his hand."`,
      odd: [
        { if: [LIT], say: `"At his forge from dark to dark, talking to it. I've never heard him say so much to a person."` },
        { say: `"Our smith. That's him on the hall step. He's sat there nine days, as near as Marta lets anybody. He'll talk to you about iron. Let him."` },
      ],
      fenn: `"The hermit from the tarn. Mad as a spring hare. He taught half this village its letters, and none of us any manners."`,
      barrow: [
        { if: CAME, say: `"We all went up. Every one of us, the little ones too. I never saw that stone moved for anybody I hadn't known all my life, and I never was so sure it was right."` },
        { say: `"The mound up north, where we put our dead. Marta goes up with a broom, spring and autumn. I asked her once what she sweeps. She said: the floor."` },
      ],
      cup: [
        { if: [{ flag: 'home.cup' }], say: `"You drank it. I saw you. I waited for the roof to come down, and Halla just filled it again."` },
        { say: `"The cup at the end of the Elder's table? Nobody touches it. When I was small my brother dared me to, and I got as far as reaching, and the old Elder said my name from the other end of the hall without looking up. I haven't reached for anything since."` },
      ],
      thane: [
        { if: [LIT], say: `"I shall get used to it. Give me a week. I got used to my husband, and he was a harder word."` },
        { say: `"A what? That's a word out of the oldest stories. Hollowmere had Thanes when it had walls, my grandmother said. I don't think it ever had walls."` },
      ],
    },
    shrug: `"I wouldn't know about that," says Sigga. "I know bread, and I know who owes me for it."`,
    menu: [
      ask('sigga', 'The fires', 'hearth'),
      ask('sigga', 'The dough', 'dough', [COLD]),
      ask('sigga', 'The Elder', 'elder'),
      ask('sigga', "Odd's girl", 'tova'),
      ask('sigga', 'Eldmark', 'eldmark'),
      ask('sigga', 'Work', 'work'),
    ],
  },

  // Two of Hollowmere's children, kept indoors until the winter broke.
  girl: {
    id: 'girl',
    name: 'The girl',
    nouns: ['girl'],
    spec: { size: 0.72, skin: 'skin', hair: 'blond', hairStyle: 'long', tunic: 'red', legs: 'red', boots: 'fur', dress: true },
    look: 'A girl of eight or nine in a red wool dress, with snow to both elbows and the frown of a craftsman.',
    talk: [
      { if: [{ not: { flag: 'girl.met' } }], brief: true, say: `"It's the Elder," says the girl, without looking up from her work. "She doesn't know yet. You're not to tell her."`, do: [{ set: 'girl.met' }] },
      { brief: true, say: `"We weren't let out since autumn. Not once. Mother said the cold would have our noses." She packs another handful on. "It didn't get mine."` },
    ],
    topics: {
      snowman: `"The back has to be straighter," says the girl. "She never bends. I've watched."`,
      elder: `"Tova gave us the wool for its neck. It's a bit she knitted wrong." She considers. "It's all bits she knitted wrong."`,
      tova: `"She's not allowed out yet. She shouts what to do from the hall door."`,
      weather: `"It's warm," says the girl, in the snow, with blue hands, meaning every word.`,
      cup: `"We're not to touch it. Not even at the feast. Not even for a dare." She says this with the confidence of somebody who has been dared.`,
    },
    shrug: `"I'm busy," says the girl, kindly.`,
  },
  boy: {
    id: 'boy',
    name: 'The boy',
    nouns: ['boy'],
    spec: { size: 0.66, skin: 'skin', hair: 'brown', hairStyle: 'short', tunic: 'green', legs: 'leather', boots: 'fur' },
    look: 'A boy of six or so, in a tunic he has not grown into, holding two stones and waiting to be told where the eyes go.',
    talk: [
      { if: [{ not: { flag: 'boy.met' } }], brief: true, say: `The boy looks at your boots, and then all the way up at you. "Are you the Thane? Sigga says you made the fires go. Did it hurt?"`, do: [{ set: 'boy.met' }] },
      { if: [{ flag: 'boy.horse' }], brief: true, say: `"He's called Ear," says the boy, patting the front of his tunic. "Because of his ear."` },
      { brief: true, say: `"I'm doing the eyes," says the boy. It is clearly the most important job, and he has clearly been told so.` },
    ],
    topics: {
      snowman: `"It's going to have a broom," says the boy. "The Elder's got a broom. I've seen it."`,
      tova: `"She said I could have a name off her if I wanted. I've got one."`,
    },
    shrug: 'The boy considers the question, and holds up a stone instead.',
  },

  // Odd's girl. Until the hearth is lit she lies on the pallet in the hall (the room has her as a thing there).
  tova: {
    id: 'tova',
    name: 'Tova',
    nouns: ['tova'],
    spec: { size: 0.7, skin: 'skin', hair: 'brown', hairStyle: 'long', tunic: 'cream', legs: 'cream', boots: 'fur', dress: true, collar: 'fur' },
    look: 'A girl of about seven, sitting up in the bed on the far side of the hearth with a fur round her shoulders, looking at everything as if she had been away.',
    lookWhen: [{ if: [{ knows: 'word:sol' }], look: 'A girl of about seven, by the hearth, with a lump of purple wool in her lap and two needles going at it like somebody killing a snake.' }],
    talk: [
      { if: [{ flag: 'hall.feast' }], brief: true, say: 'Tova is asleep: properly asleep, with her mouth shut and her fists up by her face. Every so often somebody comes and looks at her breathing, and goes away again.' },
      { if: [{ flag: 'hall.thaw' }], brief: true, say: `"You came back the long way," says Tova, with her mouth full. "The box came back the short way. I told them you would. Nobody listens to me."` },
      { if: [{ not: { flag: 'tova.n' } }], say: `"Have you got a name?" says Tova.\n\nYou tell her you have not. She accepts this at once, as a thing that can be mended.\n\n"Then you're Biscuit," she says.`, do: [{ set: 'tova.n', to: 1 }] },
      { if: [{ flag: 'tova.n', is: 1 }], say: `"Biscuit was wrong," says Tova. "I thought about it. You're Door. Because you came in by it."`, do: [{ set: 'tova.n', to: 2 }] },
      { if: [{ flag: 'tova.n', is: 2 }], say: `"Not Door." She studies you. "Wolf."\n\nYou point out that you are not a wolf.\n\n"Big Wolf," says Tova, conceding the point.`, do: [{ set: 'tova.n', to: 3 }] },
      { if: [{ flag: 'tova.n', is: 3 }], say: `"Marta says I'm to stop. I said you hadn't got one, and everybody has to have one, and she said it wasn't mine to give." Tova lowers her voice. "My da's Odd. So you can be Even. Don't tell her."`, do: [{ set: 'tova.n', to: 4 }] },
      { if: [{ flag: 'home.cup' }], say: `"Hello, Even," says Tova. "I finished the muffler while you were gone. It's got a hole for your head. That was a mistake, but it works."` },
      { say: `"Hello, Even," says Tova, when Marta is not listening. When Marta is listening she says "Thane", with great dignity, and then spoils it.` },
    ],
    topics: {
      name: `"Tova. Everybody knows that. It's you that hasn't got one."`,
      elder: `"She had her hand on me the whole time. Da says. I don't remember it." Tova thinks. "I remember it was a very long breath."`,
      odd: `"He talks to the forge. I asked him what about. He said iron."`,
      weather: `"I was going to say something," says Tova. "At midwinter. I had my mouth open for it." She frowns. "It's gone."`,
      muffler: [
        { if: [{ knows: 'word:sol' }], say: `Tova holds up a length of purple knitting, which has more than the usual number of edges. "It's a muffler. It was Marta's muffler. Now it's going to be a muffler again, but worse."` },
        { say: `"Marta's got a purple one. She said I could learn on it. I don't think she knew what I'd need it for."` },
      ],
      hearth: `"That's your side and this is mine," says Tova. "The fire's in the middle. It's fair."`,
      bed: `"That's your side and this is mine," says Tova. "The fire's in the middle. It's fair."`,
      cup: `"Nobody drinks it. I asked why and everybody said a different thing, so nobody knows."`,
    },
    shrug: `"I don't know," says Tova. "I've been asleep."`,
    menu: [ask('tova', 'The long breath', 'elder'), ask('tova', 'Her knitting', 'muffler', [{ knows: 'word:sol' }]), ask('tova', 'What she was going to say', 'weather')],
  },

  marta: {
    id: 'marta',
    name: 'Elder Marta',
    nouns: ['elder'],
    spec: { skin: 'skin', hair: 'white', hairStyle: 'long', tunic: 'grey', legs: 'grey', boots: 'leather', dress: true, collar: 'purple' },
    look: 'Marta Coldhand, Elder of Hollowmere: tall, thin, and very straight in the back, with a muffler of purple wool that is the only colour in the room. She sits on a stool by the pallet with one hand flat on the furs. Now and then her lips move, without a sound you can catch.',
    lookWhen: [
      { if: [THAW], look: 'Marta Coldhand, Elder of Hollowmere: tall, thin, and very straight in the back. She has lost the muffler somewhere and does not seem to miss it.' },
      { if: [LIT], look: 'Marta Coldhand, Elder of Hollowmere: tall, thin, and very straight in the back, with her mending in her lap. She has the look of somebody who has slept, once, and means to be sparing with it.' },
      { if: [{ flag: 'marta.stopped' }], look: 'Marta Coldhand has both her hands on the girl, and is looking at you. Her lips are still.' },
      { if: [{ knows: 'word:iska' }], look: 'Marta Coldhand, Elder of Hollowmere: tall, thin, and very straight in the back, on a stool by the pallet with one hand flat on the furs. Her lips move. You know the word.' },
    ],
    talk: [
      // The night the hearth is lit, with everybody in the hall.
      { if: [{ flag: 'hall.feast' }], brief: true, say: `"Let them shout," says Marta. She is still on the stool, though there is no need for it now, with her hand on the furs, feeling them go up and down. "They've been quiet long enough."` },
      // The feast for the thaw. What she has to say is said when the Thane sits down.
      { if: [{ flag: 'hall.thaw' }], brief: true, say: `"Shut the door," says Marta, from the far end of the table, without looking up.` },
      // First meeting, if it was not at the inn.
      {
        if: [{ not: { flag: 'marta.met' } }],
        say: `The woman on the stool looks at nobody but you, for long enough that you start to feel the cold again.\n\n"Who would miss you?" says Marta Coldhand.\n\nYou have no answer to that.\n\n"Good," she says.`,
        do: [{ set: 'marta.met' }, { cmd: 'talk elder' }],
      },
      {
        if: [{ quest: 'hearth', max: 1 }],
        say: `"Odd's girl. Tova. She took the lung-cold at midwinter." She speaks as if she were reading out a list of stores. "There's a herb-wife called Runa, out past the old watchtower, who makes a black stuff for what the cold does to people. Two days there and back if the wolves are busy elsewhere. Bring me a bottle of it."\n\nYou ask why nobody from the village has gone.\n\n"Toke can't draw his bow. Gorm's no use to me dead. I don't intend to lose anybody this winter." She looks at you, with nothing in her face at all. "I have nobody I can spare. You, I can spare."\n\nWhile you stand there her lips move once, without a sound you can catch, and a cold goes through the hall like a door left open, and the frost feathers on the walls grow by a hair.`,
        do: [{ run: 'home', arg: 'runa' }, { run: 'mark', arg: 'runa' }, { quest: 'hearth', stage: 2 }, { score: 5, id: 'hearth.start' }, { note: "Runa's steading is marked on your map." }],
      },
      { if: [{ quest: 'hearth', is: 2 }], say: `"Out past the old watchtower. A black stuff, in a bottle." She does not look up. "You are still here."` },
      { if: [{ flag: 'marta.stopped' }, COLD], brief: true, say: `Marta does not say anything. She is looking at the flint in your hand.` },
      { if: [{ flag: 'hall.laid' }, COLD], say: '', do: [{ cmd: 'give flint elder' }] },
      { if: [{ quest: 'hearth', is: 3 }], say: `Marta sees the bottle. She does not reach for it. She keeps her hand where it is, flat on the furs over the girl's chest.\n\n"Put it on the table," she says.` },
      {
        if: [{ quest: 'message', is: 1 }],
        say: `You tell her. Marta Coldhand says nothing for the space of three breaths, which for her is a long speech. "Not dead," she says at last. "No. He wouldn't be. He never did anything he was expected to." She goes to the chest by the wall, and comes back with one grey glove. "I made him a pair, forty years ago, and never sent them. He'll only want the one now. Don't tell him I kept it."`,
        do: [{ give: 'glove' }, { quest: 'message', stage: 2 }, { run: 'mark', arg: 'ivar' }],
      },
      {
        // The morning after: the second part of the story begins.
        if: [LIT, { quest: 'north', max: 0 }],
        say: `There is smoke from every roof this morning, and frost on the inside of the shutters all the same. Marta is looking at it.\n\n"It's still the coldest winter anyone can remember," she says. "It's colder every day. I can count, Thane. One hearth doesn't mend that." She turns round. "Go down to the tarn and ask Fenn why. He'll tell you it's my fault. He'll be half right."`,
        do: [{ quest: 'north', stage: 1 }, { score: 2, id: 'north.start' }],
      },
      { if: [{ flag: 'bounty.done' }], say: 'Marta looks up from her mending as you come in, and reads the answer in how you are standing.', do: [{ run: 'bountyPay', arg: 'Elder Marta' }] },
      { if: [{ quest: 'north', is: 1 }], say: `"The tarn. Fenn. Why." Marta bites off a thread. "I've other work for a Thane, if you'd sooner be paid than told."`, do: [{ run: 'bountyOffer', arg: 'Elder Marta' }] },
      { say: `"Thane." Marta does not look up from her mending. "You have the look of someone with idle hands."`, do: [{ run: 'bountyOffer', arg: 'Elder Marta' }] },
    ],
    topics: {
      ivar: [
        { if: [{ quest: 'message', is: 3 }], say: `"Laughed, did he. He would." Marta looks at the fire for some time. "If his knees ever mend, there's a chair by this hearth." She does not say whose.` },
        { if: [{ quest: 'message', is: 2 }], say: `"You have the glove. Take it to him. And remember what you're not to tell him."` },
        { say: `"A hunter. He went north forty years ago, and a bear had him, or so the trappers said." Her face gives nothing away, which from Marta is a kind of answer.` },
      ],
      tova: [
        { if: [LIT], say: `"Mending. Loud. She has named the bellows, the hearth and you, and none of you asked."` },
        { say: `"She is seven. She took the lung-cold at midwinter. She is not worse." Marta's hand does not move on the furs. "That is all there is to tell."` },
      ],
      barrow: [
        { if: CAME, say: `"She came by the coal, onto my hearthstone, with the boy in her arms, in the middle of supper. Tova saw the ring before I did." Marta is quiet for a while. "We took them up the next morning. All of us. The place was swept. I'd seen to that much, at least, without knowing."` },
        { if: [{ flag: 'boy.home' }, THAW], say: `"He has the place. We took him up the next morning, all of us, under Tova's blanket; he weighed nothing." Marta looks at the fire. "It was swept for more than him. There's room beside him yet, and I sweep it. It isn't for you or me to say that nobody's coming."` },
        { if: [{ flag: 'sol.said' }, THAW], say: `"I went up and swept it, the morning the wind changed. I shall go on. It isn't for you or me to say that nobody's coming."` },
        { if: [LIT], say: `"I've swept one place in it for forty years, with nobody in it. The Elder before me swept it for fifty. She didn't know who for." Marta looks at the fire. "You can have the ring. I'll keep the broom."` },
        { say: `"Where we put our dead. I don't intend to have it opened this winter."` },
      ],
      hearth: [
        { if: [LIT], say: `"It burns. I sit by it of an evening and do nothing at all, which I haven't done in forty years. I find I'm rather good at it."` },
        { say: `"Laid, dry, and dead. Light it and it lies down." She does not say any more. Her lips move.` },
      ],
      fenn: [
        { if: [LIT], say: `"Clever, rude, and older than he has any right to be. He taught me my letters, one winter, me and Runa. I was quicker than she was." It does not sound like a boast. It sounds like something she has had cause to be sorry for.` },
        { say: `"Clever, rude, and older than he has any right to be. He's down at the inn with the rest. Ask him some other winter."` },
      ],
      runa: [
        { if: [LIT], say: `"Her stuff did what she said it would. Tell her so, if you pass. Not from me."` },
        { say: `"Out past the old watchtower. She was born under one of these roofs and found it too loud. She'll know who sent you. Let her say what she likes."` },
      ],
      work: [
        { if: [{ flag: 'bounty.done' }], say: `"You have the look of someone who has come to be paid."`, do: [{ run: 'bountyPay', arg: 'Elder Marta' }] },
        { if: [LIT], say: `"Work." She almost smiles. "There's never any shortage."`, do: [{ run: 'bountyOffer', arg: 'Elder Marta' }] },
        { say: `"You have your work. A bottle. Out past the watchtower." She looks at you. "And I have nothing to pay you with that you'd want."` },
      ],
      village: `"Eleven roofs. I've known every soul under them since they were born. I don't intend to lose any this winter."`,
      wolf: `"A nuisance. Toke was dealing with it until one of them dealt with Toke."`,
      name: [
        { if: [LIT], say: `"Marta. They call me Coldhand. They've called me that since I was nine years old." She looks at the hand. "Nobody remembers why. I do."` },
        { say: `"Marta. They call me Coldhand. You may call me Elder."` },
      ],
      elder: `"That's me. Do try to keep up."`,
      word: [
        { if: [LIT], say: `"Fenn taught us our letters off that stone by the tower, Runa and me. Runa traced it and said it tasted of nothing. I traced it, and that night the milk froze in the pail." She looks at the fire. "I was nine. I never said it again. Not till midwinter, with the child going out of the world in front of me and nothing else in my hand." Her mouth is a line. "I could count, Thane. I knew what it was costing, by the second day. I could not stop."` },
        { if: [{ knows: 'word:iska' }], say: `"I don't know what you mean," says Marta, and her lips are still for exactly as long as it takes her to say it.` },
        { say: `"That's the hermit's trade. Ask him."` },
      ],
      ring: [
        { if: [LIT], say: `"It's an old word, Thane. There hasn't been one in Hollowmere since before this hall was built. The Elder keeps a ring by for when there is." She looks at your hand, and then at her own, which is thinner without it. "The Elder before me gave me that ring and a broom. You can have the ring."` },
        { say: `"Brass. It was the last Elder's, and the one's before her." She turns it with her thumb. It is loose on her.` },
      ],
      thane: [
        { if: [LIT], say: `"It means the village feeds you, and you bleed for the village. It's not a good bargain. It's the only one I have, and you took it."` },
        { say: `"There hasn't been one in Hollowmere since before this hall was built. It isn't a thing a person asks for."` },
      ],
      broom: `"Birch. I've worn out eleven."`,
      cup: [
        { if: [{ flag: 'home.cup' }], say: `"Yours. It has been for longer than either of us has been alive. Don't ask me how that works. I only see it filled."` },
        { say: `"It was the last Elder's to see filled, and the one's before her. I asked her once who for. She didn't know. She saw it filled all the same." Marta looks down the table at it. "So do I."` },
      ],
      bench: [
        { if: [{ flag: 'home.cup' }], say: `"Sit where you like. You'll sit there. People do sit in their own place."` },
        { say: `"Nobody sits at that end. I couldn't tell you why. I only know I'd sooner you didn't."` },
      ],
      rhyme: `"I don't sing."`,
      muffler: [
        { if: [{ knows: 'word:sol' }], say: `"It was coming unravelled anyway," says Marta, who has never in her life owned a thing that came unravelled.` },
        { say: `"My mother dyed the wool. It's the last of it." She does not say anything else about it.` },
      ],
      weather: [
        { if: [THAW], say: `"The wind changed in the night. I woke because of the eaves." Marta looks at the shutters, which have no frost on them. "I didn't expect to live to hear that."` },
        { if: [LIT], say: `"Colder every day. One hearth doesn't mend that."` },
        { say: `"It is winter. We have had them before."` },
      ],
      north: `"There's a road north out of this valley that nobody takes. It goes to a gate. Ask Fenn; he's wanted to go up it since before I was born."`,
      wild: `"Past the ridge and the river it's nobody's country. Trappers, reavers, and the dead, who don't stay where they're put any more. Nobody out there buries anybody. The ground's too hard for a spade."`,
    },
    shrug: [
      { if: [LIT], say: `"I have a village to keep," says Marta. "Bring me questions that help."` },
      { say: `"I have a child to keep," says Marta. "Bring me a bottle."` },
    ],
    menu: [
      { label: 'Hold out the flint to her', say: 'give flint elder', if: [{ flag: 'hall.laid' }, COLD, { not: { flag: 'marta.stopped' } }] },
      ask('elder', 'The girl', 'tova'),
      ask('elder', 'The hearth', 'hearth'),
      ask('elder', 'Runa', 'runa', [COLD]),
      ask('elder', 'The ring', 'ring', [LIT]),
      ask('elder', 'The barrow', 'barrow', [LIT]),
      ask('elder', 'The cup on the table', 'cup'),
      ask('elder', 'The old words', 'word', [LIT]),
      { label: 'Payment', say: 'ask elder about work', if: [COLD] },
      { label: 'Work for a Thane', say: 'ask elder about work', if: [LIT] },
    ],
  },

  odd: {
    id: 'odd',
    name: 'Odd the smith',
    nouns: ['odd'],
    spec: { skin: 'skin', hair: 'brown', hairStyle: 'bald', beard: true, tunic: 'grey', legs: 'leather', boots: 'fur', apron: 'leather' },
    look: 'A broad, bald man in a leather apron, on the step of the hall with his hands hanging between his knees. A smith, by the forearms. He is not looking at anything.',
    lookWhen: [{ if: [LIT], look: 'A broad, bald man in a leather apron, red to the elbows with forge-light, hammering as if the iron owed him nine days and talking to it under his breath.' }],
    talk: [
      { if: [{ flag: 'hall.feast' }], brief: true, say: `Odd is sitting on the edge of the pallet with his daughter's foot in his hand, the way you would hold a tool you had thought was lost. He looks up at you. For once he has nothing to say about iron.` },
      { if: [{ flag: 'hall.thaw' }], brief: true, say: `"Thane," says Odd. He has brought his own horn, which is the size of a bucket. "Iron's the same, hot. People aren't. I've been thinking about that." It is, for Odd, a toast.` },
      {
        if: [{ not: { flag: 'odd.met' } }, COLD],
        say: `He talks to you, though you have not spoken to him.\n\n"Forge is cold," Odd says. "Iron's no good to anybody cold. People think you can hold a heat. You can't. You work it while it's in the metal, and then it's gone, and you've had it, and that's the trade." He looks at his hands. "That's the trade."`,
        do: [{ set: 'odd.met' }],
      },
      { if: [{ quest: 'hearth', is: 3 }, COLD], say: `"Cold iron goes brittle," Odd tells you. "Hit it cold and it flies apart."` },
      {
        if: [LIT, { not: { flag: 'odd.thanks' } }],
        say: `"Forge is lit." Odd does not look up from it. Then he does, which costs him something, and counts twenty-five silver into your hand. "For the sword. If you bought it. If you didn't, buy it." He turns back to the fire. "Edge or mail, after, whenever you've silver. Each time costs more than the last. That's how iron is."`,
        do: [{ set: 'odd.thanks' }, { set: 'odd.met' }, { gold: 25 }],
      },
      { if: [THAW], say: `"Iron works sweeter since the wind changed. Don't ask me why. I only hit it." He jerks his head at the forge. "Edge or mail, whenever you've the silver."` },
      { if: [LIT], say: `"Forge is lit." It is the most cheerful you have ever seen him, which is to say he very nearly looks at you. "Bring me a blade and silver and I'll put a better edge on it than it came with. Mail too."` },
      { say: `"There's a sword on the bench by the anvil. Twenty-five. Shield's fifteen. Leave the silver on the anvil." He does not look round. "I made them before. They're still good. Things keep, cold. That's the trouble with it."` },
    ],
    topics: {
      sword: `"Iron. Sharp on both sides, pointed at one end. Twenty-five silver, and it'll outlast you."`,
      shield: `"Limewood and hide. Fifteen. Stand behind it and most things bounce."`,
      hearth: [
        { if: [LIT], say: `"It took the first spark like dry moss. Nine days I couldn't get it to hold a coal." He feeds it without looking, the way you would scratch a dog.` },
        { say: `"Nine days. I laid it every morning. It lies down." He opens one hand and closes it. "You can't hammer cold. You only break things."` },
      ],
      anvil: [
        { if: [LIT], say: `"It was my father's. He talked to it. I never did." He considers the forge. "I talk to that, now. Different thing."` },
        { say: `"It was my father's. He talked to it. I don't, and we get on better."` },
      ],
      steel: [
        { if: [LIT], say: `"Tempering. You heat the edge till it's the colour of straw, quench it, and draw it back. Each time it comes out a little truer, and each time it's harder to better. Bring silver. Bring more silver each time."` },
        { say: `"Steel wants fire. I've no fire."` },
      ],
      hatchet: `"If you mean the one by the woodpile, I never saw it, and I don't want it back."`,
      work: `"I sell. I don't hire."`,
      tova: [
        { if: [LIT], say: `"She's named the bellows," says Odd. "I'm not to tell you what."` },
        { say: `"Seven." That is all he says for some time. "She was going to say something. She had her mouth open for it."` },
      ],
      elder: [
        { if: [LIT], say: `"I'd have held her myself, if I'd known how." Odd turns the iron over. "I'm glad I didn't know how."` },
        { say: `"She won't have me in. She says I let the cold in with me." He looks at his hands. "She's right. I do."` },
      ],
      barrow: `"I make things to keep people out of the ground. I don't go looking in it."`,
      name: `"Odd." He lets that sit. "It's a name."`,
      rhyme: `"I make things," says Odd. "I don't sing about them."`,
      cup: `"Horn. Not my work."`,
      ring: `"Brass. Older than my grandfather's tongs. Somebody made that to last, and didn't put their mark on it."`,
      weather: [
        { if: [THAW], say: `"Thaw's hard on a roof and easy on a smith. I'll be making hinges till midsummer."` },
        { say: `"Things keep, cold," says Odd. "That's what's wrong with it."` },
      ],
    },
    shrug: `"I talk about iron," says Odd, "and I've just about finished doing that."`,
    full: `"And carry it where?" Odd looks from %s to your pack and back. "Lighten that first. I sell iron. I don't sell mules."`,
    menu: [
      { label: 'Buy the iron sword (25 silver)', say: 'buy sword', if: [{ not: { has: 'sword' } }] },
      { label: 'Buy the round shield (15 silver)', say: 'buy shield', if: [{ not: { has: 'shield' } }] },
      { label: 'Buy the mail shirt (45 silver)', say: 'buy mail', if: [{ not: { has: 'mail' } }] },
      { label: 'Buy the steel longsword (60 silver)', say: 'buy longsword', if: [{ has: 'sword' }, { not: { has: 'longsword' } }] },
      { label: 'Sell a wolf pelt (3 silver)', say: 'sell pelt', if: [{ has: 'pelt' }] },
      { label: 'Sell a bearskin (8 silver)', say: 'sell bearskin', if: [{ has: 'bearskin' }] },
      { label: 'Sell a spare trinket (12 silver)', say: 'sell trinket', if: [{ any: [{ has: 'token' }, { has: 'torc' }, { has: 'hearthstone' }, { has: 'brooch' }, { has: 'harefoot' }, { has: 'antlers' }] }] },
      { label: 'Sell back the sword (10 silver)', say: 'sell sword', if: [{ has: 'sword' }, { has: 'longsword' }] },
      { label: 'Sell back the mail (18 silver)', say: 'sell mail', if: [{ has: 'mail' }, { has: 'bearcloak' }] },
      { label: 'Temper my blade ({temper.weaponCost} silver)', say: 'temper sword', if: [LIT] },
      { label: 'Temper my armour ({temper.armorCost} silver)', say: 'temper mail', if: [LIT, { any: [{ has: 'mail' }, { has: 'bearcloak' }] }] },
      ask('odd', 'His girl', 'tova'),
      { label: 'The cold forge', say: 'ask odd about hearth', if: [COLD] },
      { label: 'The forge', say: 'ask odd about anvil', if: [LIT] },
    ],
  },

  halla: {
    id: 'halla',
    name: 'Halla',
    nouns: ['halla'],
    spec: { skin: 'skin', hair: 'blond', hairStyle: 'long', tunic: 'green', legs: 'green', boots: 'leather', dress: true, apron: 'cream' },
    look: 'A big woman on a stool in front of the fire, feeding it one stick at a time, the way you would feed a lamb that has stopped wanting to eat. Her eyes are red to the rims.',
    lookWhen: [{ if: [LIT], look: 'The innkeeper: a big woman with her sleeves rolled, who has plainly slept, and washed, and is enjoying both.' }],
    talk: [
      { if: [{ flag: 'hall.feast' }], brief: true, say: 'Halla, with no fire left to feed, is asleep on her feet at the back of the hall. Nobody wakes her. You do not either.' },
      { if: [{ flag: 'hall.thaw' }], brief: true, say: `Halla is coming down the table with a jug. "Sit," she says. "Anywhere. There's room."` },
      {
        if: [{ not: { flag: 'halla.met' } }, COLD],
        say: `"Don't stand in its light," Halla says, without turning round. "It doesn't like being watched." She puts a bowl in your hands. "It's mostly hot."\n\nYou ask, because somebody has to, how long it has been like this.\n\n"Nine days. Midwinter night, every hearth in the valley lay down at once and went out, all but this one, and this one I didn't let. Light one now and it lies down and dies while you look at it." She puts a stick on. "I haven't let it go out."\n\n"Nine days," says the hunter, "and she hasn't slept."\n\n"I've slept," says Halla. Nobody believes her, and she does not expect them to.`,
        do: [{ set: 'halla.met' }, { heal: 6 }, { run: 'martaEnters' }],
      },
      {
        if: [COLD, { quest: 'hearth', min: 2 }, { not: { flag: 'halla.flint' } }],
        say: `Halla hears where you are going, without turning round. She takes the flint and steel from round her own neck and holds them out behind her; and then a cow's horn off the hearthstone, stopped with clay, with three coals from her fire in it.\n\n"They'll be dead before the bridge," she says. "They always are. Out past the valley you can light your own."`,
        do: [{ set: 'halla.flint' }, { give: 'flint' }, { give: 'coals' }, { sound: 'take' }],
      },
      { if: [{ not: { flag: 'halla.met' } }], say: `"In, in, and shut the door behind you. Halla. This is the Kettle and Helm." She wipes the counter without looking at it. "Ale's a silver. So is stew. A red draught is six, a torch is three, and the bed is four a night, fleas included."`, do: [{ set: 'halla.met' }] },
      { if: [THAW], say: `"There was a drip off the eaves this morning. A drip! In this month!" Halla pushes a horn across the counter without being asked. "I don't know what you did, and I've decided I don't want to. Drink that."`, do: [{ heal: 6 }] },
      { if: [LIT], say: `"I slept. A day and a night, they tell me. I'd forgotten what it was like." She pushes a horn of ale across the counter. "That one's on the house, Thane. Don't get used to it."`, do: [{ heal: 4 }] },
      { say: `"Mind the door," says Halla. She puts a stick on. "Stew's a silver. It's mostly hot."` },
    ],
    topics: {
      hearth: [
        { if: [LIT], say: `"It burns by itself now. I still wake every quarter hour to feed it." Halla shrugs. "Give me a month."` },
        { say: `"A stick every quarter hour. Not two; it smothers. Not a big one; it can't lift it." She does not take her eyes off it. "It lies flat, see. As if there were a wind on it. There's no wind."` },
      ],
      ale: `"Thin, sour, and a silver a horn. Nobody's complained twice."`,
      food: `"Barley and whatever was slowest. A silver a bowl, and it's hot. Mostly."`,
      potion: `"Fenn brews them and I sell them. Six silver. They close a wound faster than is decent."`,
      torch: [
        { if: [LIT], say: `"Pitch on a stick. Three silver."` },
        { say: `"Pitch on a stick. Three silver. They burn fine anywhere but in this valley."` },
      ],
      bed: [
        { if: [LIT], say: `"Four silver. You'll sleep like the dead, which I say more carefully than I used to."` },
        { say: `"Four silver. It's the one place in here that nobody is, because it's furthest from the fire."` },
      ],
      barrow: `"Where we'll all end up, if Marta lets us. She says not this winter."`,
      elder: [
        { if: [LIT], say: `"Asleep in her chair, a day and a night. Nobody said so."` },
        { say: `"She comes down once a day and counts us. She doesn't say anything. She looks at each one, and goes back up." Halla puts a stick on. "Don't ask her about the child."` },
      ],
      tova: [
        { if: [LIT], say: `"She was down here this morning telling my fire what its name is."` },
        { say: `"Odd's Tova. Marta's had her up at the hall since midwinter, under every fur in the village. Mine too. Nobody's seen her. Marta says she's not worse." She puts a stick on. "Nine days is a long time not to be worse."` },
      ],
      work: [
        {
          if: [THAW],
          say: `"They say there's rain, up north. Rain! And trappers coming in with pelts and all their fingers. Brekka sent word that she's alive, which from Brekka is a love letter." Halla leans on the counter. "And there's talk of a bell stuck in a frozen mere, a long way east. I only pour the ale. I don't vouch for it."`,
          do: [{ run: 'mark', arg: 'brekka' }, { run: 'mark', arg: 'ivar' }],
        },
        {
          if: [LIT],
          say: `"Now there's a fire worth sitting by, people sit, and talk. There are three out in the wild who know that country better than anyone under a roof. Brekka the trapper. Old Ivar One-Glove, if the bears haven't finished what they started. And Runa, who you've met." She fills a horn. "If you mean to walk far out there, find one of them first."`,
          do: [{ run: 'mark', arg: 'brekka' }, { run: 'mark', arg: 'ivar' }, { note: 'Two more steadings are marked on your map.' }],
        },
        { say: `"Gorm there had his seed grain taken. Toke got himself bitten. And Marta's been looking for somebody she can spare." She glances at you, for the first time. "She found you, then."` },
      ],
      name: `"Halla. Everybody here will tell you I water the ale. I do. It needs it."`,
      cup: [
        { if: [{ flag: 'home.cup' }], say: `"I'd filled it again before you'd put it down. My hand did it. Thirty years I've moved that cup out of people's way, and I never thought to fill it twice in a night."` },
        { say: `"I fill it. Feast-days, first thing, before anybody else's: the best I have, as my grandmother did. What was in it from the last feast goes back in the cask, because nobody drank it and I'm not throwing good ale on the floor." She glances round. "Don't tell Marta about the cask."` },
      ],
      chest: `"For lodgers. Put in it what you like and take it out when you like. Nobody in this village steals, and anybody who started would have to carry it out past me."`,
      flint: [
        { if: [LIT], say: `"Keep it. I never want to strike that thing again as long as I live."` },
        { say: `"It's a flint. It makes a spark. The spark's not the trouble."` },
      ],
      fenn: [
        { if: [LIT], say: `"Back at his tarn. He left a book behind. It's about sheep. I think it was meant as a remark."` },
        { say: `"In the corner with his books, complaining about the light. He walked in from the tarn the second day with a sack on his back. I thought it was food."` },
      ],
      runa: `"Born here. She brews a black stuff that puts back what the cold takes. The red ones are Fenn's, whatever she tells you."`,
    },
    shrug: `"That's past what I know," says Halla. "I know ale, and who drinks too much of it."`,
    full: `"You'll rattle," says Halla, looking at your pack. "Put something down first. There's a chest by the bed for lodgers, and the floor is free."`,
    menu: [
      { label: 'A horn of ale (1 silver)', say: 'buy ale' },
      { label: 'A bowl of stew (1 silver)', say: 'buy food' },
      { label: 'A red draught (6 silver)', say: 'buy potion' },
      { label: 'A pitch torch (3 silver)', say: 'buy torch', if: [{ not: { has: 'torch' } }] },
      { label: 'The bed for a night (4 silver)', say: 'sleep bed' },
      ask('halla', 'The fire', 'hearth'),
      ask('halla', "Odd's girl", 'tova', [COLD]),
      ask('halla', 'What people are saying', 'work'),
    ],
  },

  fenn: {
    id: 'fenn',
    name: 'Old Fenn',
    nouns: ['fenn'],
    spec: { skin: 'skin', hair: 'white', hairStyle: 'bald', beard: true, tunic: 'grey', legs: 'grey', boots: 'leather', dress: true, cloak: 'grey' },
    look: 'The oldest person you have ever seen, in a grey robe, with a white beard to his belt and ink on every finger. He looks at you as if you were a footnote.',
    lookWhen: [
      { if: [COLD], look: 'The oldest person you have ever seen, in the corner of the inn furthest from the door, with a sack of books for a seat and one open on his knee. He looks at you as if you were a footnote.' },
      { if: [{ quest: 'errand', max: 1 }], look: 'The oldest person you have ever seen, on his knees on the shore in the snow, looking out at something in the ice. He has ink on every finger. He does not explain.' },
    ],
    talk: [
      {
        if: [{ not: { flag: 'fenn.met' } }, COLD],
        say: `"You're in my light," says the old man in the corner, though what light there is comes from behind him. "Fenn. Yes, the hermit. I am here for the fire and not for the company; do not confuse the two. Nine days I've had with nothing to do but think, and I've thought of nothing I like." He turns a page. "If you can read, I brought the books worth saving, and they cost silver. There's a singed one on my table at the tarn, if the damp hasn't had it. Take it. I never liked it."`,
        do: [{ set: 'fenn.met' }],
      },
      { if: [{ quest: 'errand', is: 1 }, { has: 'amulet' }], say: `"Is that..." He has gone very still. "You have it. You actually have it." He holds out a hand that is not quite steady.` },
      {
        // The sum. Said on the shore, where he looks at what the ice kept; or indoors, once he has it back.
        if: [{ quest: 'north', is: 1 }, { quest: 'errand', max: 1 }],
        say: `"So you're the Thane," he says, getting up slowly and with a great deal of complaint. "Hollowmere goes without one for longer than anybody can remember, and when it gets one at last, it has less history than a snowflake. Marta Coldhand. I taught that woman her letters. I should have taught her sums."\n\nHe jabs a finger at you.\n\n"One child. One word. One room. Every fire in a valley out in a night. Now. Every winter of my life has been colder than the one before it, and I have had eighty-odd. Do the sum."\n\nYou do it. He watches you do it.\n\n"Bigger than a child," says Fenn. "Further off than a room. Longer than anybody could keep it up who has to stop for breath." He lets that sit. "I've looked sixty years for one stone, and walked everywhere a man can walk in this country, looking. There's one road I never went up. North. There's a gate across it, and the men on the gate have been dead longer than anybody remembers, and nobody has told them. Past it, the wind stops. When I was a boy they said it stopped a week past the gate. Now they say you can stand on the gate and see where."\n\nHe looks out at the ice again.\n\n"There's a word the dead can't stand. It's under the Giant's Table, and it only shows itself at night, and it's in the south, which is the wrong way entirely. These things are always arranged like that." He is quiet for a moment. "I was going to go for it. That was the spring I was going to go." He turns his back on you. "Go on, then. You're in my light."`,
        do: [{ quest: 'north', stage: 2 }, { set: 'fenn.met' }, { set: 'goal.dolmen', to: 'dolmen' }, { score: 3, id: 'north.fenn' }, { run: 'study', arg: 20 }, { note: "The Giant's Table is marked on your map." }],
      },
      {
        if: [{ quest: 'north', is: 1 }],
        say: `"So you're the Thane," he says, not getting up. "Hollowmere goes without one for longer than anybody can remember, and when it gets one at last, it has less history than a snowflake. Marta Coldhand. I taught that woman her letters. I should have taught her sums."\n\nHe jabs a finger at you.\n\n"One child. One word. One room. Every fire in a valley out in a night. Now. Every winter of my life has been colder than the one before it, and I have had eighty-odd. Do the sum."\n\nYou do it. He watches you do it.\n\n"Bigger than a child," says Fenn. "Further off than a room. Longer than anybody could keep it up who has to stop for breath." He lets that sit. "I've looked sixty years for one stone, and walked everywhere a man can walk in this country, looking. There's one road I never went up. North. There's a gate across it, and the men on the gate have been dead longer than anybody remembers, and nobody has told them. Past it, the wind stops. When I was a boy they said it stopped a week past the gate. Now they say you can stand on the gate and see where."\n\nHe looks at the amulet on its nail by the window.\n\n"There's a word the dead can't stand. It's under the Giant's Table, and it only shows itself at night, and it's in the south, which is the wrong way entirely. These things are always arranged like that." He is quiet for a moment. "I was going to go for it. That was the spring I was going to go." He picks up his book. "Go on, then. You're in my light."`,
        do: [{ quest: 'north', stage: 2 }, { set: 'fenn.met' }, { set: 'goal.dolmen', to: 'dolmen' }, { score: 3, id: 'north.fenn' }, { run: 'study', arg: 20 }, { note: "The Giant's Table is marked on your map." }],
      },
      {
        if: [{ flag: 'winter.broken' }, { knows: 'word:orun' }, { not: { flag: 'fenn.told' } }],
        say: `You tell him where the stone was.\n\n"On the far side of the gate." Fenn sits down, which he does not do in front of people. "Of course it was. Sixty years, and everywhere a man can walk, and the one road I never went up, for the sake of a row of dead men with spears." He is silent for some time. "I said I should be annoyed. I find I am mostly old."\n\nThen he has the rest out of you: the footprints, the hollow, the hands flat on the snow. He does not write any of it down.\n\n"Three hundred winters," he says at last. "Without a breath between. Marta managed nine days of it, and it very nearly killed her." He looks at the window. "I know a little about not being able to leave a thing where it lies. I should not care to do it for three hundred."`,
        do: [{ set: 'fenn.told' }, { score: 5, id: 'north.told' }, { run: 'study', arg: 60 }],
      },
      { if: [{ quest: 'north', is: 3 }], say: `"You have it. I can tell: you keep your mouth shut like a man carrying a full cup." Fenn does not look up. "Don't say it in here. My eyes are old. Go north and say it to people who need telling."` },
      { if: [{ quest: 'errand', is: 1 }], say: `"My amulet is still in the ice, I notice, and you are still standing here."` },
      { if: [{ not: { flag: 'fenn.met' } }, { quest: 'errand', max: 1 }], say: `"You're in my light," says the old man, without getting up off his knees or looking round. "Fenn. Yes, the hermit. No, I'm not lonely."`, do: [{ set: 'fenn.met' }] },
      { if: [{ not: { flag: 'fenn.met' } }], say: `"Shut the door, you're letting the weather in." He does not look up. "Fenn. Yes, the hermit. No, I'm not lonely."`, do: [{ set: 'fenn.met' }] },
      { say: `"Well? I have four hundred books to get through and one lifetime, most of it used."` },
    ],
    topics: {
      barrow: `"A grave. A big one, and well kept. Marta sweeps it. Ask her what for and she'll tell you: the floor."`,
      menhir: [
        { if: [{ knows: 'word:orun' }], say: `"West ridge. The old watchtower. The Giant's Table. And one on the wrong side of a gate, as I now know."` },
        { say: `"Two stones near this valley still hold their words: one on the west ridge, one by the old watchtower. There are others, further off. There is one I never found."` },
      ],
      word: [
        { if: [LIT], say: `"VETH opens, and pushes. ISKA stills. Each lives in a stone, and each tires the tongue: speak one and you must wait before it will come to you again." He looks at you over the book. "Unless you are past needing breath."` },
        { say: `"Old words, cut in standing stones. Nobody can teach you one. You read it off the stone or you go without. There's one by the old watchtower and one on the west ridge." He turns a page. "I taught two little girls their letters off the one by the tower, one winter, because it was nearer than my hut. I've had sixty years to wonder whether that was wise."` },
      ],
      tarn: [
        {
          if: [{ quest: 'errand', is: 0 }],
          say: `"Forty years ago my wife went through that ice. Her amulet came up the next winter and froze in where you can see it, right in the thin middle, and I've looked at it every day since. Nine days I have not, sitting in that inn." He does not look at you. "I can't reach it. Nothing heavier than a hare can cross there. Unless the ice were made to freeze harder; and there's a word for that, as this valley has cause to know. Bring me the amulet, and I'll give you Light. You'll want it, in the dark places."`,
          do: [{ quest: 'errand', stage: 1 }, { score: 2, id: 'errand.start' }],
        },
        { if: [{ quest: 'errand', is: 2 }, COLD], say: `"It's only ice now. Forty years I went down to that shore every morning, to look at one bright thing I couldn't reach." Fenn turns a page. "I shall have to find something else to do with my mornings. I'm told that is what books are for."` },
        { if: [{ quest: 'errand', is: 2 }], say: `"It's only ice now. Forty years I went down to that shore every morning, to look at one bright thing I couldn't reach." Fenn turns a page. "This week I've stayed in and read. I'm told that is what books are for."` },
        { say: `"Thin in the middle. It wouldn't hold you unless something froze it harder. ISKA would, if you had it. The stone that holds ISKA stands by the old watchtower, out past the ford."` },
      ],
      amulet: [
        { if: [{ has: 'amulet' }], say: `"Give it here. Please." It is the first time you have heard him say please, and possibly the first time he has.` },
        { if: [{ quest: 'errand', is: 2 }, COLD], say: `"In my pocket." He puts his hand over it. "Where I can't see it and can have it. After forty years of the other way about, I find I prefer it."` },
        { if: [{ quest: 'errand', is: 2 }], say: `"On the nail by the window, where the light gets at it." He does not look that way. "Asa would say it was a waste of a good necklace to hang it on a nail. She'd be right. She generally was."` },
        { say: `"Silver, with a moonstone. Hers. It's out in the middle of the tarn, where I can see it and can't have it."` },
      ],
      hearth: [
        { if: [LIT], say: `"Mine burns. Yours burn. Don't expect me to be astonished; I had worked it out by the third day, and nobody asked me."` },
        { say: `"Mine went out with the rest. I have a theory about why, and no intention of saying it aloud in a room with eleven frightened people in it."` },
      ],
      tome: `"Mend is fifteen silver, Frost twenty, Ward twenty-five. The singed one on my table is free; I never liked it."`,
      light: `"A small spell and a kind one. I don't sell it. I give it, to people who do me a kindness."`,
      flame: `"Loud, showy, effective. It's on the table in my hut. Read it before you need it, not after."`,
      frost: `"It slows what it strikes. Twenty silver."`,
      mend: `"It closes wounds. Fifteen silver, and worth ten times that the first time you need it."`,
      ward: `"It halves what hits you, for a little while. Twenty-five silver."`,
      magic: `"There are two kinds worth the name. Spells, which you learn from books and pay for in breath: Flame, Frost, Mend, Light, Ward. And the old words, which you learn from stones and pay for in waiting."`,
      wife: `"Asa. She laughed at everything, me most of all. Forty years." He turns a page he has not read.`,
      cup: `"The oldest thing in Hollowmere isn't the barrow. It's that cup. Not the horn, which is new every few lifetimes: the habit. People who never knew whose it was have filled it for longer than anybody has kept count." He sniffs. "I have never been so annoyed by a piece of kindness in my life."`,
      thane: `"An old word. Whoever the valley sent, when a thing had to be gone and seen to. The last one went before that village had a hall, and nobody wrote down where. I have looked."`,
      ring: `"The Elder's brass ring? It is older than the office. I asked three Elders whose it was. I got the same answer three times, which was a look."`,
      gap: [
        { if: [{ flag: 'gate.open' }], say: `"They went in, you say. All together, and shut nothing behind them." He writes something down. "Nobody ever came to relieve them. I suppose you did."` },
        { say: `"Two towers and a row of dead men. I got within a bowshot, at thirty. They turned their heads, all together. I found I had business at home."` },
      ],
      north: `"A road, a gate, and past it a place where the wind stops. I have that from six books and one liar, and they agree, which the books never do."`,
      veth: `"Open. Away. Make room. It's cut into the stone on the west ridge, above the pinewood. It will knock a wolf off its feet, and open what is frozen shut, and make a way through what will not move aside."`,
      iska: [
        { if: [LIT], say: `"You've seen what it does, when somebody won't stop saying it."` },
        { say: `"Stillness. It stops a thing where it is: a wolf, a river for a breath or two, snow in the air. And the going has to be taken out of the thing and put somewhere." He looks at Halla's flat little fire. "Hold a hand out the next time you hear it said, and feel which way the warmth goes."` },
      ],
      sol: [
        { if: [{ knows: 'word:sol' }], say: `"SOL." Fenn says it under his breath, and the fire stands up straight for a moment. "Day. I had it from a book, as a rumour of a rumour, and you've had it from the stone. I shan't ask you to say it in here."` },
        { if: [{ quest: 'north', min: 2 }], say: `"The sun's own name. The dead can't stand it. Under the Giant's Table, in the south, beyond the first wall, and only after dark. Wait for night, and look under the capstone."` },
        { say: `"There are tales of a word that is the sun's own name. If it was ever cut into a stone, the stone is a long way from here."` },
      ],
      orun: [
        { if: [{ flag: 'fenn.told' }], say: `"Past the gate. Sixty years." He shakes his head, and goes back to his book, and does not turn the page.` },
        { if: [{ knows: 'word:orun' }], say: `"You have it." He puts the book down. "Where? No. Sit. Tell me where."`, do: [{ cmd: 'talk fenn' }] },
        { say: `"See. Uncover. I have never found its stone, and I've looked for sixty years. If you find it, come and tell me where. I shall be very annoyed."` },
      ],
      elder: [
        { if: [LIT], say: `"She did the only thing she knew how to do, and it was the wrong thing, and she did it for nine days without sleeping." Fenn turns a page. "I have known wiser people do worse with less cause."` },
        { say: `"Marta. Quick. She always was. Ask me nothing else about her this winter."` },
      ],
      wight: [
        { if: [{ flag: 'winter.broken' }], say: `"Sat down, I hear. Where they stood." He nods slowly. "They were only ever trying to get somewhere and be done."` },
        { if: [{ quest: 'north', min: 2 }], say: `"They don't stay where they're put. They did, when I was young. Whatever is wrong with the winter is wrong with them, and they all walk the same way, and it is the way I've just sent you."` },
        { say: `"The dead walk, out past the valley, and nobody out there buries anybody. I have a great many books on the subject. None of them agree."` },
      ],
      eldmark: `"A town. I bought books there, when it was one. It didn't fall; it thinned. A roof a winter, going south."`,
      name: `"Fenn. It will do."`,
    },
    shrug: `"That is either beneath my notice or above yours," says Fenn, and turns a page.`,
    full: `"Your pack is fuller than my shelves, and my shelves are full," says Fenn. "Put something down. Not in here."`,
    menu: [
      { label: 'Give him the amulet', say: 'give amulet', if: [{ has: 'amulet' }] },
      { label: 'Give back the books you have read', say: 'give tome to fenn', if: [{ any: [{ has: 'tomeFlame' }, { has: 'tomeFrost' }, { has: 'tomeMend' }, { has: 'tomeLight' }, { has: 'tomeWard' }] }] },
      ask('fenn', 'The old words', 'word'),
      ask('fenn', 'ISKA', 'iska', [{ any: [{ knows: 'word:iska' }, LIT] }]),
      ask('fenn', "The sun's name", 'sol', [{ quest: 'north', min: 2 }]),
      ask('fenn', 'The gate in the north', 'gap', [{ quest: 'north', min: 2 }]),
      { label: 'Where the stone was', say: 'ask fenn about orun', if: [{ knows: 'word:orun' }, { not: { flag: 'fenn.told' } }] },
      ask('fenn', 'The tarn', 'tarn'),
      { label: 'Buy the book of Mend (15 silver)', say: 'buy mend', if: [{ not: { has: 'tomeMend' } }] },
      { label: 'Buy the book of Frost (20 silver)', say: 'buy frost', if: [{ not: { has: 'tomeFrost' } }] },
      { label: 'Buy the book of Ward (25 silver)', say: 'buy ward', if: [{ not: { has: 'tomeWard' } }] },
      ask('fenn', 'His fire', 'hearth'),
    ],
  },

  toke: {
    id: 'toke',
    name: 'Toke the hunter',
    nouns: ['toke'],
    spec: { skin: 'skin', hair: 'brown', hairStyle: 'hood', beard: true, tunic: 'green', legs: 'leather', boots: 'fur', cloak: 'green' },
    look: 'A lean man in a green hood, nursing a hand bound up in rags. He is watching the door, not you.',
    lookWhen: [
      { if: [{ quest: 'wolves', is: 2 }, { flag: 'toke.mended' }], look: 'A lean man in a green hood. The bite on his hand has closed to a pink seam, and his bow is yours now. He is watching the trees, not you.' },
      { if: [{ quest: 'wolves', is: 2 }], look: 'A lean man in a green hood with a bandage on one hand. His bow is yours now. He is watching the trees, not you.' },
      { if: [{ flag: 'toke.mended' }], look: 'A lean man in a green hood with a bow on his back. The bite on his hand has closed to a pink seam. He is watching the trees, not you.' },
      { if: [LIT], look: 'A lean man in a green hood with a bow on his back and a bandage on one hand. He is watching the trees, not you.' },
    ],
    talk: [
      { if: [{ flag: 'hall.feast' }], brief: true, say: `Toke stands a little apart, as hunters do indoors, with a horn of ale in his good hand. "They'll want a speech," he says. "Don't give them one. Nobody ever went back out into a winter the better for a speech."` },
      { if: [{ flag: 'hall.thaw' }], brief: true, say: `"Walked it," says Toke, looking at your boots. "All of it. I can see by the leather." He nods, once, as he would at a clean shot.` },
      {
        if: [{ quest: 'wolves', is: 0 }, LIT],
        say: `"Toke. I hunt, when I've two hands." He holds up the one in rags. "A pack came down off the ridge when the cold got bad, and one of them had this before I could draw. I can't pull a bow like this." He flexes it and winces. "Kill three of them for me and the bow's yours. It's no use to me before spring. Two in this wood, west of here, and one at least up on the ridge."`,
        do: [{ quest: 'wolves', stage: 1 }, { score: 2, id: 'wolves.start' }],
      },
      {
        if: [{ quest: 'wolves', is: 0 }],
        say: `"Keep your voice down. She's counting sticks." He nods at the woman by the fire, and then at his own hand. "Toke. I hunt, when I've two hands. A pack came down off the ridge when the cold got bad, and one of them had this before I could draw. I can't pull a bow like this." He flexes the rags and winces. "Kill three of them for me and the bow's yours. It's no use to me before spring. Two in the pinewood, west of the square, and one at least up on the ridge."`,
        do: [{ quest: 'wolves', stage: 1 }, { score: 2, id: 'wolves.start' }],
      },
      {
        if: [{ quest: 'wolves', is: 1 }, { flag: 'wolves.killed', min: 3 }],
        say: `"Three. I heard them go quiet, one after another." He unslings the bow and holds it out. "A bargain's a bargain. She pulls a little to the left. You'll get used to it."`,
        do: [{ quest: 'wolves', stage: 2 }, { give: 'bow' }, { score: 10, id: 'wolves.done' }, { note: 'Tip: EQUIP BOW, then attack to loose an arrow. SWAP changes back.' }],
      },
      { if: [{ quest: 'wolves', is: 1 }], say: `"Not three yet. There are two in the west of the pinewood and at least one up on the ridge. Don't let them get behind you."` },
      { if: [THAW, { flag: 'toke.mended' }], say: `"I heard a thrush this morning. In the pinewood, in this month." Toke shakes his head slowly. "And my hand's whole. I could take that bow back." He very nearly smiles. "No. Keep her. You've fed her better than I ever did."` },
      { if: [THAW], say: `"I heard a thrush this morning. In the pinewood, in this month." Toke shakes his head slowly. "My hand's mending, too. Another week and I'll want that bow back." He very nearly smiles. "No. Keep her. You've fed her better than I ever did."` },
      { if: [LIT, { quest: 'wolves', is: 2 }], say: `"Thane, they tell me. The wolves will have heard; they hear everything." He looks you over. "There are deer again, out past the valley. Halla pays for venison, if you can get near enough to loose."` },
      { if: [COLD], say: `"Nine days in one room with eleven people." Toke looks at the door. "I'd sooner the wolves."` },
      { say: `"Quiet wood, for once. I could get used to it."` },
    ],
    topics: {
      wolf: `"They lunge, bite, and dance back out of reach. Hit them as they come in, or put your back to a tree and let them break their teeth on your guard." He looks at the door. "They stop at the lip of the valley, lately. They sit down up there and watch. I've never known a wolf not follow a thing into a place before."`,
      bow: `"Yew. Draws heavy, shoots true. Three wolves, and she's yours."`,
      stag: `"There are deer yet, out past the valley: in the pinewoods and by the meres, and only by day. Loose from as far off as you can see them. Come one step too near and all you'll have is the white of a tail." He flexes the bandaged hand. "Halla pays for venison. So does your belly." He lowers his voice. "And a long way out, they say, there's a white one. I saw it once, at dusk, forty paces off. I didn't loose. I've never been sure whether that was wisdom."`,
      camp: `"South-west, past the ford. Robbers. They hit Gorm's farm two nights after the fires went. Three of them, and one has a bow, so don't stand about in the open."`,
      bandit: `"Three, in the hollow past the ford. Kill the one with the bow first, or he'll make you regret every step."`,
      dog: `"A grey bitch, called Ash. Best nose in the valley. She wouldn't go up that ridge for meat nor shouting, and I never had a dog that was wrong about a place."`,
      menhir: `"On the bare ridge, west and north. I don't go near it. My dog wouldn't either, when I had a dog."`,
      tree: `"I've hunted that wood thirty years. It's never been this quiet, or this cold."`,
      work: `"Three wolves. That's the work."`,
      elder: [
        { if: [LIT], say: `"She told me I couldn't draw my bow. She was right." Toke flexes the hand. "She told you that you could be spared. I'd not have liked to be told that. You went anyway."` },
        { say: `"She says I can't draw my bow. She's right. She said it as if she'd counted my fingers."` },
      ],
      rhyme: `"I don't sing. It tells things where you are."`,
      cup: `"I've never been to a feast I didn't leave early."`,
      wight: [
        { if: [{ flag: 'winter.broken' }], say: `"Sat down. All along the north road, at the side of it, facing the way they were going. I walked past forty of them and not one got up." Toke watches the trees for a while. "I'm glad I never loosed at one. I'd have wondered about it, after."` },
        { say: `"I hunt things that are alive. Those are somebody else's trouble. They don't come into the valley, I'll say that. Nothing does, lately, that doesn't have to."` },
      ],
      name: `"Toke."`,
    },
    shrug: `"I hunt," says Toke. "The rest is other people's business."`,
    menu: [
      ask('toke', 'The wolves', 'wolf'),
      ask('toke', 'The bow', 'bow'),
      ask('toke', 'Hunting deer', 'stag'),
      ask('toke', 'The stone on the ridge', 'menhir'),
      ask('toke', 'The robbers', 'camp'),
    ],
  },

  brekka: {
    id: 'brekka',
    name: 'Brekka the trapper',
    nouns: ['brekka'],
    spec: { skin: 'skin', hair: 'red', hairStyle: 'long', tunic: 'leather', legs: 'leather', boots: 'fur', cloak: 'fur', collar: 'fur' },
    look: 'A weathered woman in a coat made of several animals, none of them recently alive. She has a skinning knife in one hand and seems to have forgotten it is there.',
    talk: [
      { if: [{ not: { flag: 'brekka.met' } }], say: `"Well. A face." She looks you over as she might a pelt. "Brekka. I trap, I skin, I keep to myself. You're the first two-legged thing I've seen since the leaves fell that wasn't trying to rob me, or dead. Are you trying to rob me? No. Good. Then we can trade."`, do: [{ set: 'brekka.met' }, { run: 'home', arg: 'brekka' }] },
      {
        if: [{ quest: 'greyback', is: 2 }],
        say: `"Dead? The Greyback?" She makes you tell it twice, and the second time she wants the details. Then she is gone, with a sledge and a knife, and back before dark with the hide. She cuts and stitches by the fire while you wait, and does not say a word until it is done. "There." She hangs it round your shoulders. "He kept me cold for six winters. He can keep you warm."`,
        do: [{ give: 'bearcloak' }, { quest: 'greyback', stage: 3 }, { score: 8, id: 'greyback.done' }, { set: 'goal.brekka', to: false }],
      },
      { say: `"Still alive, then. Out here that's most of the news there is."` },
    ],
    topics: {
      work: [{ say: `"I walk a long way for my skins, and I see what there is to see."`, do: [{ run: 'rumour', arg: 'Brekka the trapper' }] }],
      wolf: `"More of them every winter, and bolder. I take their pelts and they take my hares. It evens out, mostly in their favour."`,
      bear: [
        {
          if: [{ quest: 'greyback', is: 0 }],
          say: `"The white ones I can live with. There's one bear I'd pay to see dead. A grey one, old, with a scar across his face, bigger than any white bear you've met. He follows my trap-lines and eats what I catch, and last month he ate the dog." She spits. "He dens in the crags. Kill the Greyback, and I'll make you something from his hide that you'll not be sorry to own."`,
          do: [{ run: 'haunt', arg: 'greyback' }, { quest: 'greyback', stage: 1 }, { score: 2, id: 'greyback.start' }],
        },
        { if: [{ quest: 'greyback', is: 1 }], say: `"He dens in the crags, and he's not hard to find. He finds you. Keep your guard up: he swings slow, but he only has to land once."` },
        { say: `"White, big as a shed, and bad-tempered about being woken. Stay in front of one and keep your guard up: it swings slow, but it only has to land once."` },
      ],
      dog: [
        { if: [{ quest: 'greyback', is: 3 }], say: `"Stone. He'd have liked that cloak. He liked anything that smelled of bear, right up to the end."` },
        { say: `"Stone. Ugly as a boot, and worth two of me on a trap-line." She looks at the peg by the door, where a collar hangs. "Six winters he kept that bear off the catch. The seventh, he was slower."` },
      ],
      weather: [
        { if: [{ flag: 'winter.broken' }], say: `"It let go. I felt it in the night, like a hand coming off the back of my neck." Brekka scowls at the sky. "Now the snow will rot and the pelts will be poor. I'm not complaining."` },
        { say: `"It was never this cold when I was a girl. Something has got into the winter."` },
      ],
      village: `"Hollowmere? I go in at midsummer, sell my skins to the smith, and come straight out again. Too many people. Eleven roofs!"`,
      pelt: `"Four silver for a wolf, ten for a bear, if you can carry it. I pay better than that tight-fisted smith."`,
      pack: [
        { if: [{ has: 'trappack' }], say: `"It'll outlast you, if you keep it out of rivers." She tugs the chest-strap anyway, the way she would test a snare, and grunts.` },
        {
          if: [{ has: 'pelt', n: 6 }],
          say: `"Six. Lay them out." She goes over each pelt as if it owed her money, and throws none of them back. Then she sits down by the fire with an awl and a hank of sinew and does not speak again until the light has gone. What she hands you at the end of it is a pack of grey wolf-hide, fur turned in, with a frame of willow sewn into the back and a strap across the chest. "There. Six wolves carried their own winters on their backs all their lives," she says. "They can carry yours."`,
          do: [{ lose: 'pelt', n: 6 }, { give: 'trappack' }, { score: 3, id: 'brekka.pack' }, { sound: 'quest' }],
        },
        { say: `"That bag." She looks at it as she looked at you the first time, as at a pelt, and finds it wanting. "You carry like somebody who means to come back for things. Out here nobody comes back for things. Bring me six wolf pelts, sound ones, and I'll make you something worth carrying." She is already measuring your shoulders with her eye.` },
      ],
      potion: `"Seven silver. My own brewing: frostcap, red moss, and a thing I'll not name. It'll close a wound."`,
      name: `"Brekka. My mother had hopes for me. They didn't include this."`,
      rhyme: `"Out here you sing to tell the bears where you are, and they're not particular about the words."`,
      wight: [
        { if: [{ flag: 'winter.broken' }], say: `"Sat down. Every one, where it stood, at the side of whatever track it was on, looking north. I walked my lines by moonlight last night for the first time in my life, and met nothing but an owl." Brekka shakes her head. "I'm keeping the knife by the bed all the same."` },
        { say: `"The dead are walking. They don't come for the traps; they go by. All one way, like geese that have got it wrong: north. And nobody puts them in the ground. You can't get a spade in it."` },
      ],
      trap: `"Deadfalls for marten, snares for hare, and a pit for anything bigger, which I've never yet had the courage to look into. You learn to read snow like a page. Most of what it says is: something was here, and it was hungry."`,
      wild: `"Wood, fell, water, wood again, and then a wall of rock right round the lot, with reavers sat in every gap. And past that, more of it, and another wall. It gets worse the further you go, and so does the pay, for those who hunt."`,
      north: `"There's a gate up there with dead men on it. I've seen it from the last ridge. I've no skins to sell to dead men."`,
    },
    shrug: `"I know traps and weather," says Brekka. "The rest is somebody else's trouble."`,
    full: `"You're carrying more than my sledge does," says Brekka. "Empty something out first. I don't mind things for people. They don't come back for them."`,
    menu: [
      { label: 'Buy a red draught (7 silver)', say: 'buy potion' },
      { label: 'A pack, from six wolf pelts', say: 'ask brekka about pack', if: [{ not: { has: 'trappack' } }] },
      { label: 'Sell a wolf pelt (4 silver)', say: 'sell pelt', if: [{ has: 'pelt' }] },
      { label: 'Sell a bearskin (10 silver)', say: 'sell bearskin', if: [{ has: 'bearskin' }] },
      { label: 'Sell frostcaps (2 silver)', say: 'sell herb', if: [{ has: 'herb' }] },
      ask('brekka', 'The country round about', 'work'),
      ask('brekka', 'The bears', 'bear'),
      ask('brekka', 'The walking dead', 'wight'),
    ],
  },

  ivar: {
    id: 'ivar',
    name: 'Ivar One-Glove',
    nouns: ['ivar'],
    spec: { skin: 'skin', hair: 'white', hairStyle: 'short', beard: true, tunic: 'green', legs: 'grey', boots: 'fur', cloak: 'leather' },
    look: 'An old hunter, lean as a rail. His right sleeve is pinned up at the wrist, and his left hand is bare and the colour of oak. He leans on a spear he plainly no longer needs for walking.',
    lookWhen: [{ if: [{ quest: 'message', is: 3 }], look: 'An old hunter, lean as a rail. His right sleeve is pinned up at the wrist, and on his left hand is a glove of good grey wool, which he keeps looking at. His spear is yours now, and he does not seem to miss it.' }],
    talk: [
      { if: [{ not: { flag: 'ivar.met' } }], say: `"Sit, if you can find something to sit on." He does not get up. "Ivar. They call me One-Glove; the other is inside a bear, and I hope it disagreed with him. I hunted this country forty years. Now I mostly watch it."`, do: [{ set: 'ivar.met' }, { run: 'home', arg: 'ivar' }] },
      {
        if: [{ quest: 'message', is: 2 }, { has: 'glove' }],
        say: `You hold out the glove. Ivar looks at it for a long time, and then at his bare hand, and then he laughs until he has to sit down. "Forty years! And the left one, too. She kept count." He pulls it on. It fits. "Here. I'm past using this, and you're plainly not." He puts his boar-spear into your hands, and closes your fingers round it.`,
        do: [{ lose: 'glove' }, { give: 'spear' }, { quest: 'message', stage: 3 }, { score: 8, id: 'message.done' }, { set: 'goal.ivar', to: false }],
      },
      { say: `"Back again? Then you're harder to kill than you look, and I meant that kindly."` },
    ],
    topics: {
      work: [{ say: `"I don't walk as far as I did. But I know where things are, and things don't move much."`, do: [{ run: 'rumour', arg: 'Ivar One-Glove' }] }],
      wolf: `"A wolf comes in fast, bites, and is gone before you've finished swearing. Don't chase. Let it come to you, and be ready when it does."`,
      bear: `"He gave me fair warning. He stood up, and he took his time, the way they do. I was young and thought I was quicker." He holds up the hand he has left. "Watch for the moment before the blow. There's always a moment."`,
      weather: [
        { if: [{ flag: 'winter.broken' }], say: `"There's a north wind again. An honest one, with snow in it that lands. I stood out in it like a fool." Ivar shakes his head. "I don't know what you did up there, and at my age I've learned not to ask."` },
        { say: `"Forty winters, and each worse than the one before. And the wind's moved. When I was young it was the north wind you feared. Now you can walk north for a week and it gets quieter, and quieter, till you can hear your own eyelids." He looks at the fire. "I turned round. A hunter knows when a wood is too quiet."` },
      ],
      north: `"Quiet. No wind, no birds. I saw snow up there that wasn't falling. It was just there, in the air, like flies in amber. I'm not a man who turns round, and I turned round."`,
      village: `"Is Marta still Elder? Then it's still standing. Tell her Ivar's not dead, if she asks. She'll not ask."`,
      pelt: `"Four silver a wolf. Ten for a bear, and I'll want to hear how you did it."`,
      potion: `"Seven silver. Runa brews them, out past the old tower. I only sell them on."`,
      name: `"Ivar. The rest you can see for yourself."`,
      rhyme: `"Marta sang once, at a midsummer fire, before she was Elder and while she still sang. She'll tell you she never sang in her life." He grins. "Ask her."`,
      glove: `"The right one went with the hand, into a bear. I kept the left out of spite, and then I lost that too, crossing the mere. So now I'm One-Glove with no gloves at all, and the name's stuck anyway."`,
      trap: `"Hunting is waiting, mostly. You wait till the thing you want is where you want it, and then you don't miss. Fighting is the same, only the waiting is shorter. Watch for the moment before the blow."`,
      wild: `"There are towers out there that nobody remembers building, and vaults under them that somebody was at pains to keep shut. Take a light, if you go down. And there are walls: rock, right round the country, one outside another. Somebody holds every gap."`,
      wight: [
        { if: [{ flag: 'winter.broken' }], say: `"One sat down outside my door. He's there yet, with his back to the wall, facing north. I put a blanket over him. I don't know why. It seemed the least a neighbour could do."` },
        { say: `"They go north. I've watched them forty winters. None ever comes back south, so wherever it is they're going, they don't get there."` },
      ],
      elder: [
        {
          if: [{ quest: 'message', is: 0 }],
          say: `"Marta Coldhand. I asked her to marry me once. She said she'd sooner marry the weather. She was right, too." He is quiet a while. "She'll think the bear got all of me. Tell her it didn't. Tell her Ivar's not dead yet. I'd go myself, but my knees have opinions about the distance."`,
          do: [{ quest: 'message', stage: 1 }, { score: 2, id: 'message.start' }],
        },
        { say: `"Marta Coldhand. I asked her to marry me once. She said she'd sooner marry the weather. She was right, too."` },
      ],
    },
    shrug: `"That's a young man's question," says Ivar, "and I've forgotten the answer."`,
    full: `"Lighten that pack first," says Ivar. "I went through the ice on the mere once, for the sake of one more thing on my back. That's where my other glove is."`,
    menu: [
      { label: 'Buy a red draught (7 silver)', say: 'buy potion' },
      { label: 'Sell a wolf pelt (4 silver)', say: 'sell pelt', if: [{ has: 'pelt' }] },
      { label: 'Sell a bearskin (10 silver)', say: 'sell bearskin', if: [{ has: 'bearskin' }] },
      { label: 'Sell frostcaps (2 silver)', say: 'sell herb', if: [{ has: 'herb' }] },
      ask('ivar', 'The country round about', 'work'),
      ask('ivar', 'His missing glove', 'bear'),
      ask('ivar', 'The Elder', 'elder'),
      ask('ivar', 'The north', 'north'),
    ],
  },

  runa: {
    id: 'runa',
    name: 'Runa',
    nouns: ['runa'],
    spec: { skin: 'skin', hair: 'brown', hairStyle: 'long', tunic: 'green', legs: 'green', boots: 'leather', dress: true, apron: 'cream', collar: 'fur' },
    look: 'A small brisk woman with bunches of grey things hanging from her belt, and her hands stained black to the wrist. She smells of smoke and of something sharper.',
    talk: [
      {
        // The errand the Elder sent: this comes before any greeting.
        if: [{ quest: 'hearth', is: 2 }],
        say: `She does not ask who you are. She asks who sent you, and when you tell her, she laughs once, without much pleasure in it.\n\n"Marta Coldhand wants something from me. Is Halla still telling people the red draughts are Fenn's?"\n\nYou say you would not know.\n\n"They're mine." She takes down a stone bottle and begins to fill it from a pot. "Three frostcaps and a long night. It puts back what the cold takes out, and it stays put back. Who is it for?"\n\nYou tell her about the girl under the furs, and the hall, and the frost on the walls.\n\n"And she's breathing?"\n\nYou think about it. You cannot remember having seen her breathe.\n\nRuna stops pouring for a moment, and then goes on.\n\n"Fenn taught the two of us our letters, Marta and me, the one winter," she says. "She was quicker than I was. She was always quicker." She stops the bottle and puts it in your hands. "If the girl can swallow it, it'll mend her."\n\n"If," you say.\n\n"If," says Runa.`,
        do: [{ set: 'runa.met' }, { run: 'home', arg: 'runa' }, { give: 'bottle' }, { quest: 'hearth', stage: 3 }, { score: 5, id: 'hearth.bottle' }, { set: 'goal.runa', to: false }, { sound: 'quest' }],
      },
      { if: [{ not: { flag: 'runa.met' } }], say: `"Mind where you put your feet, there are frostcaps under that snow." She looks up at last. "Oh. A person. I'm Runa. I gather, I dry, I brew. If you've picked anything on your way, I'll pay for it, and if anything has picked at you, I can mend that too."`, do: [{ set: 'runa.met' }, { run: 'home', arg: 'runa' }] },
      { if: [LIT, { not: { flag: 'runa.heard' } }], say: `"She swallowed it?" Runa puts down what she is holding. "All of it? Then she'll do. She'll be loud for a month. They are, after." She picks it up again. "And Marta stopped. I'd not have bet on that." She thinks. "No. For a child, I would."`, do: [{ set: 'runa.heard' }] },
      { say: `"You again, and with all your fingers. Well done."` },
    ],
    topics: {
      work: [{ say: `"I go wherever the frostcaps grow, and that takes me about."`, do: [{ run: 'rumour', arg: 'Runa' }] }],
      herb: `"Frostcaps. They come up under the snow, in the lee of trees and beside still water, never in the open. Two silver, and I'll take as many as you bring."`,
      potion: `"Frostcap, red moss, and patience. Seven silver. Halla sells mine in the village and calls them Fenn's. I let her."`,
      moss: `"It grows on the north side of the old stones, and nowhere else. I'll not tell you which stones. A woman has to keep something back."`,
      wild: `"People call it empty. It's not empty. It's full of things that aren't people, which is a different thing, and in my view a better one."`,
      mend: `"For a cut, a draught. For the cold that gets into the bone and stays, my tonic. For anything worse, the old stones, if they're in a giving mood."`,
      tonic: `"Black, bitter, and it puts back what the cold takes out of you. For good, mind, not for an afternoon. It takes three frostcaps to make one, and I never have three to spare. Bring me your own."`,
      fenn: `"He taught me my letters, when I was small, and I taught him which mushrooms not to eat. He still owes me for that."`,
      // What Runa knows about Marta and the stone, for whoever asks before the hearth is lit.
      menhir: [
        { if: [LIT], say: `"That stone has done enough for one winter. Leave it be."` },
        { say: `"The one by the old watchtower? That's where he taught us. He sat us down in front of it with a slate, because it was nearer than walking to the tarn. I traced it, and it tasted of nothing. Marta traced it and went white, and wouldn't say why, and that night the milk froze in her mother's pail." Runa turns a frostcap over in her black fingers. "If you haven't put your hand on it, do, on your way back. And then go and look at that hall again."` },
      ],
      elder: [
        { if: [LIT], say: `"Born two roofs from me. Quicker than me at everything, and never once enjoyed it." Runa almost smiles. "Tell her the stuff is three frostcaps a bottle and she owes me three frostcaps."` },
        { say: `"Born two roofs from me. Quicker than me at everything, and never once enjoyed it. She'd not send to me for a headache. Whatever's in that hall, she's frightened of it." Runa looks at the pot. "I've been thinking, since you came, about the winter Fenn taught us our letters."` },
      ],
      weather: [
        { if: [{ flag: 'winter.broken' }], say: `"The frostcaps will sulk. Everything else is delighted."` },
        { say: `"The frostcaps like it. Nothing else does."` },
      ],
      wight: [
        { if: [{ flag: 'winter.broken' }], say: `"They've stopped. I went into the dead wood at dusk to see, and they were sitting down, every one, like people who've been told they can." Runa turns a frostcap over. "I'd got used to them. That's a terrible thing to say, but I had."` },
        { say: `"I've seen them, in the dead wood. They don't see me. I think they only see what's warm, and I've been cold a long time."` },
      ],
      name: `"Runa. Just Runa. Out here there's nobody to confuse me with."`,
      village: `"I was born under one of those eleven roofs. It was too loud. Out here I can hear things grow."`,
      tova: [
        { if: [LIT], say: `"Loud yet? Good."` },
        { say: `"Seven, you said. And not breathing that you saw, and not dead." She says nothing else for a while. "Take her the bottle."` },
      ],
    },
    shrug: `"If it doesn't grow, I've no opinion on it," says Runa.`,
    full: `"And where would it go? You're carrying half the country already." Runa waits, not unkindly, for you to put something down.`,
    menu: [
      { label: 'The winter Fenn taught her letters', say: 'ask runa about menhir', if: [COLD, { quest: 'hearth', min: 3 }] },
      { label: 'Buy a red draught (7 silver)', say: 'buy potion' },
      { label: 'Sell frostcaps (2 silver)', say: 'sell herb', if: [{ has: 'herb' }] },
      { label: 'Sell a wolf pelt (4 silver)', say: 'sell pelt', if: [{ has: 'pelt' }] },
      { label: 'Sell a bearskin (10 silver)', say: 'sell bearskin', if: [{ has: 'bearskin' }] },
      { label: 'Trade three frostcaps for a tonic', say: 'buy tonic', if: [{ has: 'herb', n: 3 }] },
      ask('runa', 'The country round about', 'work'),
      ask('runa', 'Marta', 'elder'),
      ask('runa', 'Her tonic', 'tonic'),
      ask('runa', 'The walking dead', 'wight'),
    ],
  },

  gorm: {
    id: 'gorm',
    name: 'Gorm the farmer',
    nouns: ['gorm'],
    spec: { skin: 'skin', hair: 'blond', hairStyle: 'short', beard: true, tunic: 'leather', legs: 'grey', boots: 'leather', collar: 'white' },
    look: 'A big, slow farmer in a sheepskin jerkin, with the stunned look of a man who has been robbed and has not finished being angry about it.',
    lookWhen: [{ if: [COLD], look: 'A big man in a sheepskin jerkin, sitting with his head in his hands. Somebody tells you, as if it explained him, that robbers took his seed grain.' }],
    talk: [
      { if: [{ flag: 'hall.feast' }], brief: true, say: `Gorm stands looking at the fire the way he looks at a field in a good year. "That will do," he says, to nobody in particular. "That will do."` },
      { if: [{ flag: 'hall.thaw' }], brief: true, say: `"I've a ewe leaning on my leg in a field gone soft," says Gorm, "and I left her to come and eat with you. Don't tell her."` },
      {
        if: [{ has: 'ewe' }, { at: ['farm'] }],
        say: `Gorm sees her before he sees you. He does not say anything. He goes down on one knee in the snow and takes her face in both hands, and she lets him, which you would not have bet on. "Bryn," he says. "That's Bryn. She went through the fence the night they took the grain." He stands, and counts along the pen with his lips moving, and gets to four. "Four," says Gorm, to the sheep, the farm, and you. "I can count to four again." He gives you everything he has in his pockets, which is nine silver and the end of a cheese.`,
        do: [{ lose: 'ewe' }, { set: 'farm.stray' }, { gold: 9 }, { give: 'cheese' }, { sound: 'quest' }],
      },
      {
        if: [{ quest: 'stores', is: 0 }, LIT],
        say: `"They came at night, two nights after the fires went. Took the seed grain. All of it." Gorm looks at the barrel by the door, which is very empty. "There was smoke from the one roof in the whole valley, then. From up on the pass it must have looked as if there was nobody left down here to mind." He breathes out. "A farm can lose a winter. It can't lose a spring. They're camped south-west, past the ford; I saw their smoke. I'm no fighter. Bring back my grain and I'll pay you everything I have, which is twenty-five silver."`,
        do: [{ quest: 'stores', stage: 1 }, { score: 2, id: 'stores.start' }],
      },
      {
        if: [{ quest: 'stores', is: 0 }],
        say: `"They came at night, two nights after the fires went. Took the seed grain. All of it." Gorm does not lift his head far out of his hands. "One chimney smoking in a whole valley. From up on the pass it must look as if there's nobody left down here to mind." He breathes out. "A farm can lose a winter. It can't lose a spring. They're camped south-west, past the ford; I saw their smoke. Smoke! They can keep a fire, out there. I'm no fighter. Bring back my grain and I'll pay you everything I have, which is twenty-five silver."`,
        do: [{ quest: 'stores', stage: 1 }, { score: 2, id: 'stores.start' }],
      },
      {
        if: [{ quest: 'stores', is: 1 }, { has: 'grain' }],
        say: `You swing the sack down off your shoulder. Gorm looks at the G burned into it, then at you, then at the sack again, and for a moment you think he is going to cry. He counts twenty-five silver into your hand instead, very carefully, and then adds a cheese.`,
        do: [{ lose: 'grain' }, { gold: 25 }, { give: 'cheese' }, { quest: 'stores', stage: 2 }, { score: 10, id: 'stores.done' }],
      },
      { if: [{ quest: 'stores', is: 1 }], say: `"South-west, past the ford. You'll see their smoke. Mind yourself."` },
      { if: [THAW], say: `"The snow on the south field has gone soft. Soft! I put my hand in it." Gorm holds the hand up, as if it might still be wet. "I'll be sowing in a month. You'll have the first loaf, Thane, and the second."` },
      { if: [COLD], say: `"There'll be a spring now, thanks to you. If there's a spring." Gorm looks at Halla's little fire. "I'd give the grain back to see that stand up straight."` },
      { say: `"There'll be a spring now, thanks to you. Have you met the sheep? They like you. As much as they like anything."` },
    ],
    topics: {
      sheep: [
        { if: [{ flag: 'farm.stray' }], say: `"Four. I had eleven, and then three, and now four. I count them every night. It doesn't take long, but I enjoy it more than I did."` },
        { say: `"Three left. I had eleven. Wolves, cold, one that simply gave up, and one that went through the fence the night they came for the grain. She'll be bones by now."` },
      ],
      grain: `"Seed for the whole east field, in a sack with my mark on it: a G in a ring."`,
      bandit: `"Three of them, I think. One with a bow. They laughed, that's what I remember."`,
      camp: `"South-west, past the ford, in the trees. I saw smoke."`,
      work: `"Bring back my grain. That's all the work I have, and all I can pay for."`,
      tarn: `"North-east. Old Fenn lives on the shore. Don't cross the ice: it looks sound and isn't."`,
      tower: `"The old watchtower, out past the ford, a morning down the south road. Nobody goes there. Somebody has been lately; I've seen a light. A fire'll light, out there."`,
      name: `"Gorm. That's my mark on the sack."`,
      rhyme: `"I sing to the ewes at lambing. They don't care for it, but they hold still to listen, and that's all I ask of a song."`,
      tova: [
        { if: [LIT], say: `"She came out to the farm on Odd's shoulders and told my ewes their names. They'd names already. They've others now."` },
        { say: `"Odd's little one. She used to come and count my sheep for me, wrong." He puts his head back in his hands.` },
      ],
      cup: [
        { if: [{ quest: 'stores', is: 2 }], say: `"Never had a feast at my place to set one at. If I did, I'd have set one for my seed grain." He considers this. "And it came home."` },
        { say: `"Never had a feast at my place to set one at. If I did, I'd set one for my seed grain, and see if it came home."` },
      ],
    },
    shrug: `"I only know sheep and soil," says Gorm. "And that my grain is gone."`,
    menu: [
      ask('gorm', 'The stolen grain', 'grain'),
      ask('gorm', 'The robbers', 'bandit'),
      ask('gorm', 'The sheep', 'sheep'),
      ask('gorm', 'The old watchtower', 'tower'),
    ],
  },

  // She kneels in the hollow past the gate. What can be done there is in the room's rules.
  kneeler: {
    id: 'kneeler',
    name: 'The woman',
    // "Woman" is one of the baker's words; out here it can only mean this one.
    nouns: ['kneeler', 'sigga'],
    spec: { skin: 'ice', hair: 'white', hairStyle: 'long', tunic: 'snow', legs: 'snow', boots: 'snow', dress: true, cloak: 'snow', eyes: 'ice', hunch: true, outline: 'ice', ragged: true },
    look: 'The cold has kept her as she was the hour she knelt down, and she might be any age. Frost has grown over her shoulders like a fur. Her eyes are open and white. Her hands are spread flat on the drift in front of her, the way you would put your hands on somebody\'s back to feel them breathing, and her lips are moving. On one of her hands is a brass ring.',
    lookWhen: [{ if: [{ flag: 'hollow.joined' }], look: 'Her lips have stopped. She is looking at you, and at your hand, and at the ring on it.' }],
    talk: [
      { if: [{ flag: 'hollow.joined' }], brief: true, say: 'She does not speak. Whatever she had to say, she has been saying it for three hundred winters, and she has stopped.' },
      { brief: true, say: 'She does not hear you. Her lips are moving, and they have been moving for longer than Hollowmere has had a hall. She is saying ISKA, ISKA, ISKA, without a breath between, because the dead do not get tired, and do not have to wait.' },
    ],
    shrug: 'She does not hear you. She is saying the one word.',
  },
};

