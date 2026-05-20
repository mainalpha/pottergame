-- Run on an existing potters_duel database (does not drop data).
USE potters_duel;

DELETE FROM cards WHERE side = 'neutral';

UPDATE cards SET image_url = '/assets/img-cards/Albus Dumbledore.jpg' WHERE name = 'Albus Dumbledore';
UPDATE cards SET image_url = '/assets/img-cards/harry potter.jpg' WHERE name = 'Harry Potter';
UPDATE cards SET image_url = '/assets/img-cards/hermione granger.jpg' WHERE name = 'Hermione Granger';
UPDATE cards SET image_url = '/assets/img-cards/Minerva McGonagall.jpg' WHERE name = 'Minerva McGonagall';
UPDATE cards SET image_url = '/assets/img-cards/Sirius Black.jpg' WHERE name = 'Sirius Black';
UPDATE cards SET image_url = '/assets/img-cards/Severus Snape.jpg' WHERE name = 'Severus Snape';
UPDATE cards SET image_url = '/assets/img-cards/Remus Lupin.jpg' WHERE name = 'Remus Lupin';
UPDATE cards SET image_url = '/assets/img-cards/Alastor Moody.jpg' WHERE name = 'Alastor Moody';
UPDATE cards SET image_url = '/assets/img-cards/Molly Weasley.jpg' WHERE name = 'Molly Weasley';
UPDATE cards SET image_url = '/assets/img-cards/Kingsley Shacklebolt.jpg' WHERE name = 'Kingsley Shacklebolt';
UPDATE cards SET image_url = '/assets/img-cards/Lord Voldemort.jpg' WHERE name = 'Lord Voldemort';
UPDATE cards SET image_url = '/assets/img-cards/Bellatrix Lestrange.jpg' WHERE name = 'Bellatrix Lestrange';
UPDATE cards SET image_url = '/assets/img-cards/Tom Marvolo Riddle.jpg' WHERE name = 'Tom Marvolo Riddle';
UPDATE cards SET image_url = '/assets/img-cards/Lucius Malfoy.jpg' WHERE name = 'Lucius Malfoy';
UPDATE cards SET image_url = '/assets/img-cards/Fenrir Greyback.jpg' WHERE name = 'Fenrir Greyback';
UPDATE cards SET image_url = '/assets/img-cards/Dolores Umbridge.jpg' WHERE name = 'Dolores Umbridge';
UPDATE cards SET image_url = '/assets/img-cards/Barty Crouch Jr.jpg' WHERE name = 'Barty Crouch Jr';
UPDATE cards SET image_url = '/assets/img-cards/Antonin Dolohov.jpg' WHERE name = 'Antonin Dolohov';
UPDATE cards SET image_url = '/assets/img-cards/Peter Pettigrew.jpg' WHERE name = 'Peter Pettigrew';
UPDATE cards SET image_url = '/assets/img-cards/Narcissa Malfoy.jpg' WHERE name = 'Narcissa Malfoy';
