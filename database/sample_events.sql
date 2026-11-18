-- Optional demo data so the dashboards are not empty. Delete these rows before going live.
insert into public.events (title, description, category_id, venue, start_date, end_date, registration_deadline, capacity, status)
select v.title, v.descr, c.id, v.venue, now() + v.d, now() + v.d + interval '2 hours', now() + v.d - interval '1 hour', v.cap, 'published'
from (values
 ('Intro to Cloud Computing','Hands-on session covering cloud basics and deploying your first app.','Workshop','Lecture Theatre 1', interval '3 days', 60),
 ('Careers in Tech Seminar','Industry speakers share how to land your first role.','Seminar','Main Auditorium', interval '5 days', 200),
 ('Inter-Faculty Football Finals','The season finale between the top two faculties.','Sports','University Stadium', interval '7 days', 500),
 ('Campus Hackathon 2026','24 hours to build, pitch and win prizes.','Competition','Innovation Hub', interval '12 days', 80),
 ('Cultural Night','Music, food, fashion and performances from across campus.','Cultural Event','Student Centre', interval '15 days', 300),
 ('Research & Innovation Conference','Undergraduate and postgraduate research showcase.','Conference','Conference Hall', interval '21 days', 150)
) as v(title, descr, cat, venue, d, cap)
join public.categories c on c.name = v.cat;
