import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from groq_service import normalize_analysis_result


class AtsScoreNormalizationTests(unittest.TestCase):
    def test_calculates_score_from_breakdown_when_ai_score_is_wrong(self):
        raw_result = {
            "ats_score": 10,
            "ats_breakdown": {
                "contact": 10,
                "sections": 20,
                "skills": 40,
                "keywords": 10,
            },
        }

        normalized = normalize_analysis_result(raw_result)

        self.assertEqual(normalized["ats_score"], 80)

    def test_clamps_score_to_100_when_breakdown_exceeds_limit(self):
        raw_result = {
            "ats_score": 5,
            "ats_breakdown": {
                "contact": 10,
                "sections": 30,
                "skills": 40,
                "keywords": 20,
            },
        }

        normalized = normalize_analysis_result(raw_result)

        self.assertEqual(normalized["ats_score"], 100)


if __name__ == "__main__":
    unittest.main()
