-- Insert advisors and assign to supervisors
-- Created for: Hever Cedeño, Samuel Espejo, Jose Rodriguez

BEGIN;

-- Insert all advisors
INSERT INTO public.advisors (
  full_name, first_name, second_name, first_surname, second_surname,
  document_id, city, province, address, email, phone, code, contract_signed
) VALUES
  -- Supervisor Hever Cedeño advisors
  ('Kerly Paola Pincay Figueroa', 'Kerly', 'Paola', 'Pincay', 'Figueroa', '1315544575', 'Jipijapa', 'Manabí', 'Jipijapa', 'kpincayfigueroa@gmail.com', '0990947598', 'ADV-JPI-002', false),
  ('Marisol del Jesus Roldan Velez', 'Marisol', 'del Jesus', 'Roldan', 'Velez', '1310845019', 'Manta', 'Manabí', 'Cdla Villa Marina', 'maryroldan1981@gmail.com', '0960109790', 'ADV-MTA-002', false),
  ('Cindy Dayana Pincay Pivaque', 'Cindy', 'Dayana', 'Pincay', 'Pivaque', '1315158814', 'Jipijapa', 'Manabí', 'Calle 10 de agosto y Santisteban', 'cindypincay1998@gmail.com', '0985397416', 'ADV-JPI-003', false),
  ('Ruth Noemi Tuarez Manzaba', 'Ruth', 'Noemi', 'Tuarez', 'Manzaba', '0944289412', 'Manta', 'Manabí', 'Leonidas Proaño, atras del colegio Kerly Torres', 'manzaban2@gmail.com', '0980833821', 'ADV-MTA-003', false),
  ('Jessica Leonor Escalante Zambrano', 'Jessica', 'Leonor', 'Escalante', 'Zambrano', '1716579980', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Villa Florida Av Ing Broow', 'jessi19812026@outlook.com', '0984180314', 'ADV-SDO-002', false),
  ('Jose Manuel Aldaz Bailon', 'Jose', 'Manuel', 'Aldaz', 'Bailon', '1314027523', 'Manta', 'Manabí', 'Barrio El Porvenir', 'josealdaz485@gmail.com', '0989527981', 'ADV-MTA-004', false),
  ('Jesus Eduardo Montilva Gomez', 'Jesus', 'Eduardo', 'Montilva', 'Gomez', '1354058685', 'Manta', 'Manabí', 'Av 113 Villas del Seguro, frente a Motriza', 'montilvajesus416@gmail.com', '0999778167', 'ADV-MTA-005', false),
  ('Hever Gardel Cedeño Zambrano', 'Hever', 'Gardel', 'Cedeño', 'Zambrano', '1720717568', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Villa Florida Av Ing Broow', 'jeanpierre872010@hotmail.com', '0984180314', 'ADV-SDO-003', false),
  
  -- Supervisor Samuel Espejo advisors
  ('Robinson Ariel Solorzano Lucio', 'Robinson', 'Ariel', 'Solorzano', 'Lucio', '2300282858', 'Quito', 'Pichincha', 'El Inca', 'robinsonsolorzano99@gmail.com', '0979201061', 'ADV-UIO-002', false),
  ('Emily Amaris Preciado Carreño', 'Emily', 'Amaris', 'Preciado', 'Carreño', '2300385479', 'Quito', 'Pichincha', 'El Inca', 'emilipre200613@gmail.com', '0969442207', 'ADV-UIO-003', false),
  ('Samuel Alejandro Espejo Santana', 'Samuel', 'Alejandro', 'Espejo', 'Santana', '2350398984', 'Quito', 'Pichincha', 'Solanda', 'samuelespejo907@gmail.com', '0980093358', 'ADV-UIO-004', false),
  ('Gustavo David Navarrete Parrales', 'Gustavo', 'David', 'Navarrete', 'Parrales', '1718207341', 'Quito', 'Pichincha', 'El Inca', 'gustavonavarre@gmail.com', '0980174285', 'ADV-UIO-005', false),
  
  -- Supervisor Jose Rodriguez advisors
  ('Erika Sofia Verdezoto Marcillo', 'Erika', 'Sofia', 'Verdezoto', 'Marcillo', '1725047136', 'Quito', 'Pichincha', 'El Inca', 'erika.sweetss@hotmail.com', '0999336015', 'ADV-UIO-006', false),
  ('Angel Dario Preciado Nieves', 'Angel', 'Dario', 'Preciado', 'Nieves', '0802238881', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Santa Martha #1 Calle Jacinto Cortés y S/N', 'anda007uprinoceronte@gmail.com', '0978790208', 'ADV-SDO-004', false),
  ('Veronica Isabel Suarez Quilumbango', 'Veronica', 'Isabel', 'Suarez', 'Quilumbango', '1721310355', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Vía Quedado km 5', 'veronicasua0802@gmail.com', '0994385876', 'ADV-SDO-005', false),
  ('Andy Ronald Guerron Ortiz', 'Andy', 'Ronald', 'Guerron', 'Ortiz', '2300817562', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Coop. Nueva Republica Calle Rivera y Temuco', 'andyguerron01@gmail.com', '0995308271', 'ADV-SDO-006', false),
  ('Andrea Silviana Guerron Ortiz', 'Andrea', 'Silviana', 'Guerron', 'Ortiz', '0604635979', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Coop. Nueva República', 'andreaguerron16@gmail.com', '0980393257', 'ADV-SDO-007', false),
  ('Ronny Michael Alcivar Campos', 'Ronny', 'Michael', 'Alcivar', 'Campos', '2300848096', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Bellavista via al penal', 'ronnyalcivar12345@gmail.com', '0958777077', 'ADV-SDO-008', false),
  ('Jimmy Jesus Alcivar Mendoza', 'Jimmy', 'Jesus', 'Alcivar', 'Mendoza', '1722841366', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Bellavista vía al penal', 'jimmyalcivar1985@hotmail.com', '0985862032', 'ADV-SDO-009', false),
  ('Susana Silvana Campos Medina', 'Susana', 'Silvana', 'Campos', 'Medina', '1723189047', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Bellavista vía al penal', 'susanacampos500@yahoo.com', '0981534927', 'ADV-SDO-010', false),
  ('Angel Steven Barros Moreira', 'Angel', 'Steven', 'Barros', 'Moreira', '1950063030', 'Santo Domingo', 'Santo Domingo de los Tsáchilas', 'Coop. 2 de Mayo', 'barrosangel194@gmail.com', '0959443316', 'ADV-SDO-011', false);

-- Assign advisors to supervisors using the exact full names provided by the user
INSERT INTO public.supervisor_advisors (supervisor_id, advisor_id)
SELECT DISTINCT
  p.id AS supervisor_id,
  a.id AS advisor_id
FROM public.advisors a
JOIN public.profiles p
  ON p.role = 'supervisor'
WHERE
  (
    (
      (a.code LIKE 'ADV-JPI-%' OR a.code LIKE 'ADV-MTA-%' OR (a.code LIKE 'ADV-SDO-%' AND a.code IN ('ADV-SDO-002', 'ADV-SDO-003')))
      AND p.full_name ILIKE '%Hever%'
    )
    OR
    (
      a.code IN ('ADV-UIO-002', 'ADV-UIO-003', 'ADV-UIO-004', 'ADV-UIO-005')
      AND (
        p.full_name ILIKE '%Samuel%' OR p.full_name ILIKE '%Samuel Alejandro Espejo Santana%'
      )
    )
    OR
    (
      (a.code = 'ADV-UIO-006' OR (a.code LIKE 'ADV-SDO-%' AND a.code NOT IN ('ADV-SDO-002', 'ADV-SDO-003')))
      AND (
        p.full_name ILIKE '%Jose%' OR p.full_name ILIKE '%José%' OR p.full_name ILIKE '%Jose Gregorio%' OR p.full_name ILIKE '%José Gregorio%' OR p.full_name ILIKE '%Rodriguez%' OR p.full_name ILIKE '%Rodríguez%'
      )
    )
  )
ON CONFLICT DO NOTHING;

COMMIT;
