"""python3 -m unittest scripts/test_risks.py  (classification and geometry of scripts/risks.py)"""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from risks import fema_level, haversine_m, line_dist_m, noise_level, rough_flood_level  # noqa: E402

class T(unittest.TestCase):
    def test_noise(self):
        self.assertEqual(noise_level(120, None, 30), "high")
        self.assertEqual(noise_level(None, 100, 30), "high")
        self.assertEqual(noise_level(None, None, 1.9), "high")
        self.assertEqual(noise_level(150, None, 30), "medium")
        self.assertEqual(noise_level(None, None, 4.9), "medium")
        self.assertEqual(noise_level(400, 400, 5), "low")
        self.assertIsNone(noise_level(None, None, 20, roads_checked=False))
        self.assertEqual(noise_level(None, None, 3, roads_checked=False), "medium")
    def test_fema(self):
        for z in ("A", "AE", "AH", "AO", "VE", "V"): self.assertEqual(fema_level(z, None), "high")
        self.assertEqual(fema_level("X", "0.2 PCT ANNUAL CHANCE FLOOD HAZARD"), "medium")
        self.assertEqual(fema_level("X", "AREA WITH REDUCED FLOOD RISK DUE TO LEVEE"), "medium")
        self.assertEqual(fema_level("X", "AREA OF MINIMAL FLOOD HAZARD"), "low")
        self.assertIsNone(fema_level("D", None)); self.assertIsNone(fema_level(None, None))
    def test_rough(self):
        self.assertEqual(rough_flood_level(3, 1.5, None), "medium")
        self.assertEqual(rough_flood_level(8, 0.3, None), "medium")
        self.assertEqual(rough_flood_level(8, 1.5, None), "low")
        self.assertEqual(rough_flood_level(6, None, 0.8), "medium")
        self.assertEqual(rough_flood_level(150, 0.2, 0.1), "low")
        self.assertIsNone(rough_flood_level(None, 0.1, None))
    def test_geometry(self):
        self.assertAlmostEqual(haversine_m(0, 0, 0, 1) / 1000, 111.19, places=1)
        # point 0.001 deg north of an east-west segment at the equator: ~111 m
        self.assertAlmostEqual(line_dist_m(0.001, 0.5, [(0, 0), (0, 1)]), 111.2, delta=1)
        self.assertAlmostEqual(line_dist_m(0, 2, [(0, 0), (0, 1)]) / 1000, 111.2, delta=0.5)

if __name__ == "__main__":
    unittest.main()
