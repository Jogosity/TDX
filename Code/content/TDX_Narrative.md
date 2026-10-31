# TDX Narrative Content

> The game reads this file at runtime (Code/content/TDX_Narrative.md). Edit it freely, no code changes needed.
> Format: one `Key: value` per line. Headings (#) and note lines starting with > are ignored.
> A plain line straight after a key line becomes a new paragraph of that value (see Level_1_Narrative_Desc).
> Empty values are skipped, so blank template lines are fine.
> Avatars and logos: put the image in Code/assets/avatars/ and name it in ArchiveN_Icon. Missing or blank uses Av_BLANK_S.png.
> Typos (a missing colon, an unknown key, a level pool naming a missing archive) are listed in the debug menu under STORY.

## Screen Text

Archive_Heading: Archive Record
Core_Memory_Heading: Core Memory
Secondary_Memories_Heading: Secondary Memories
Archive_Attack_Line1: Victim under attack
Archive_Attack_Line2: Defend their data!
Result_Win_Title: SUCCESS
Result_Lose_Title: FAILURE
Result_Win_Label: Archive defended
Result_Lose_Label: Archive breached
Result_Cores_Label: Cores protected
Memories_Lost_Heading: Memories Lost:
No_Memories_Lost: None. Every memory is safe.

> Any archive can override the result labels: ArchiveN_Win_Label and ArchiveN_Lose_Label.

## Level Content Data

> Level_N_Archives: the archive numbers this level can pick from, e.g. 1, 3, 7. One is picked at random each run.
> Leave it blank to pick from every finished archive (one with a Name and at least one Core Memory).


Level_1_Label: Archive 001
Level_1_Narrative_Label: Mischief Makers
Level_1_Narrative_Desc: Data thieves are targeting members of the public. There's no extortion, no threats. It's just a bit of fun.
It's not like the victims lives are being completely ruined...
Level_1_Archives: 1

Level_2_Label: Archive 002
Level_2_Narrative_Label: Trouble Starters
Level_2_Narrative_Desc: This is the long description for Level 2. There is an indication that the hacking is more serious than you first thought.
Level_2_Archives: 

Level_3_Label: Archive 003
Level_3_Narrative_Label: Chaos
Level_3_Narrative_Desc: This is the long description for Level 3. It is clear that the hackers are targeting larger organisations
Level_3_Archives: 

Level_4_Label: Archive 004
Level_4_Narrative_Label: Anarchy
Level_4_Narrative_Desc: This is the long description for Level 4. We now know that the hackers are attacking human memories via implants.
Level_4_Archives: 

Level_5_Label: Archive 005
Level_5_Narrative_Label: Destruction
Level_5_Narrative_Desc: This is the long description for Level 5. No one is safe. No government. No individual.
Level_5_Archives: 



## Archives

> Each run shows 1 random Core Memory and 3 random Secondary Memories. Add as many of each as you like.
> Memories lost: 1 for every 4 Cores lost (15 Cores), Secondary ones first. The Core Memory goes when you're down to 1 Core. Losing the level loses all 4.
> The _Summary line is what the Level Result screen lists. If it's missing, the full text is used.

Archive1_Icon: Av_PersonSetB_1_S.png
Archive1_Name: Jane Doe
Archive1_Bio: School Teacher
Archive1_Type: Personal Archive
Archive1_Description: Photos and Documents

Archive1_CoreMemory1: School trip with year 11 students to Northern Italy. She had never felt so connected to her students. The laughs and tears changed her feelings about wanting to become a parent.
Archive1_CoreMemory1_Summary: School trip to Italy
Archive1_CoreMemory2: Jane Doe's second core memory. Something that she values very deeply.
Archive1_CoreMemory2_Summary: Jane's valued memory 2
Archive1_CoreMemory3: Jane Doe's third core memory. Something that she would prefer to forget, but that haunts her every day.
Archive1_CoreMemory3_Summary: The thing that haunts Jane.

Archive1_SecondaryMemory1: Playing the lead in her local am-dram production of As You Like It.
Archive1_SecondaryMemory1_Summary: Am-dram As You Like It
Archive1_SecondaryMemory2: Heartbroken that she shouted at her cat the morning that he disappeared.
Archive1_SecondaryMemory2_Summary: Shouted at her cat.
Archive1_SecondaryMemory3: Hasn't told her boytriend about the parking ticket last month in case he thinks she is stupid.
Archive1_SecondaryMemory3_Summary: Parking Ticket
Archive1_SecondaryMemory4: Went on the TV gameshow, "Pointless" but argued with her friend after he scored 200.
Archive1_SecondaryMemory4_Summary: Pointless argument
Archive1_SecondaryMemory5: Has just bought a new scarf for the winter. It's the warmest and most comforting thing she owns and can't be without it.
Archive1_SecondaryMemory5_Summary: New comfort scarf.



Archive2_Icon: Av_BLANK_S.png
Archive2_Name: Hot Buns Pastries
Archive2_Bio: Archive 2 Bio: The Tasty Pastry Shop
Archive2_Type: Archive 2 Type: Business Records
Archive2_Description: Archive 2  Description: Spreadsheets, Invoices, Emails

Archive2_CoreMemory1: Major new contract to supply the Old Lyric Theatre with 50 croissants a day. Could save the shop! Maybe I can push 50 Pain au chocolats as well! Don't forget to sign!
Archive2_CoreMemory1_Summary: Business-saving contract for croissants
Archive2_CoreMemory2: My Recipe book! Ten years of ideas, way too much to remember everything so the whole lot is in this folder. Super precious. Do not DELETE FFS!
Archive2_CoreMemory2_Summary: Recipe book.
Archive2_CoreMemory3: Local development grant available. I need to apply for this, my friend Yelena is on the committee and thinks I will be a guaranteed winner!
Archive2_CoreMemory3_Summary: Apply for the local development grant!

Archive2_SecondaryMemory1: The rent on the shop is overdue. The November invoice needs to be paid by Wednesday.
Archive2_SecondaryMemory1_Summary: Shop rent overdue.
Archive2_SecondaryMemory2: The lighting in the shop feels like an interrogation chamber. The electrictian is coming to refit everything on Thursday 18th. 
Archive2_SecondaryMemory2_Summary: Lighting refit.
Archive2_SecondaryMemory3: Special offer of flour from Crushed-It Flour Wholesalers! Orders only open for 12 hours on Monday.
Archive2_SecondaryMemory3_Summary: Flour special offer
Archive2_SecondaryMemory4: Bake-Off audition email chain. One last step and I'm on the show! Awaiting the next appointment.
Archive2_SecondaryMemory4_Summary: Bake-Off audition.
Archive2_SecondaryMemory5: New sign PDF! The printers still have the old logo for the shop. Get them the new artwork or the new sign will be shit.
Archive2_SecondaryMemory5_Summary: New sign logo.



Archive3_Icon: Av_BLANK_S.png
Archive3_Name: 
Archive3_Bio: Archive 2 Bio: 
Archive3_Type: Archive 2 Type: 
Archive3_Description: Archive 3  Description:

Archive3_CoreMemory1: 
Archive3_CoreMemory1_Summary: 
Archive3_CoreMemory2: 
Archive3_CoreMemory2_
Archive3_CoreMemory3: 
Archive3_CoreMemory3_Summary:

Archive3_SecondaryMemory1:
Archive3_SecondaryMemory1_Summary:

Archive3_SecondaryMemory2:
Archive3_SecondaryMemory2_Summary:

Archive3_SecondaryMemory3: 
Archive3_SecondaryMemory3_Summary: 
Archive3_SecondaryMemory4: 
Archive3_SecondaryMemory4_Summary: 
Archive3_SecondaryMemory5: 
Archive3_SecondaryMemory5_Summary: