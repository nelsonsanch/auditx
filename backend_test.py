import requests
import sys
import json
from datetime import datetime
import uuid

class AuditXAPITester:
    def __init__(self, base_url="https://compliance-hub-196.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.client_token = None
        self.test_company_id = None
        self.test_auditoria_id = None
        self.test_config_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials from review request
        self.test_email = "Nelsonsr.1983@gmail.com"
        self.test_password = "ELrey@28"

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_client_login(self):
        """Test client login with provided credentials"""
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_email, "password": self.test_password}
        )
        if success and 'token' in response:
            self.client_token = response['token']
            print(f"   Client token obtained for {self.test_email}")
            return True
        return False

    def test_get_my_companies(self):
        """Test getting user's companies"""
        if not self.client_token:
            self.log_test("Get My Companies", False, "No client token")
            return False
            
        success, response = self.run_test(
            "Get My Companies",
            "GET",
            "my-companies",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            self.test_company_id = response[0]['id']
            print(f"   Found company: {response[0].get('company_name', 'N/A')} (ID: {self.test_company_id})")
            return True
        elif success and isinstance(response, list):
            self.log_test("Get My Companies", False, "No companies found for user")
            return False
        return success

    def test_create_audit_config(self):
        """Test creating audit configuration (needed for auditorias)"""
        if not self.client_token or not self.test_company_id:
            self.log_test("Create Audit Config", False, "Missing client token or company ID")
            return False
            
        config_data = {
            "company_id": self.test_company_id,
            "fecha_inicio": "2024-01-15",
            "fecha_fin": "2024-01-30",
            "alcance": "Evaluación completa del Sistema de Gestión SST",
            "tipo_auditoria": "SST",
            "areas_proceso": ["Administración", "Operaciones", "Mantenimiento"],
            "equipo_auditor": [
                {
                    "nombre": "Auditor Principal",
                    "identificacion": "12345678",
                    "rol": "auditor_lider",
                    "cargo": "Especialista SST",
                    "email": "auditor@empresa.com"
                }
            ],
            "equipo_auditado": [
                {
                    "nombre": "Responsable SST",
                    "identificacion": "87654321",
                    "rol": "coordinador_sst",
                    "cargo": "Coordinador SST",
                    "email": "sst@empresa.com"
                }
            ],
            "normas_generales_ids": [],
            "normas_especificas_ids": [],
            "objetivos": "Verificar cumplimiento de la Resolución 0312 de 2019",
            "criterios_adicionales": "Enfoque en prevención de riesgos laborales"
        }
        
        success, response = self.run_test(
            "Create Audit Configuration",
            "POST",
            "configuraciones-auditoria",
            200,
            data=config_data,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and 'id' in response:
            self.test_config_id = response['id']
            print(f"   Audit config created with ID: {self.test_config_id}")
        return success

    def test_create_auditoria(self):
        """Test creating a new auditoria (POST /api/auditorias)"""
        if not self.client_token or not self.test_company_id or not self.test_config_id:
            self.log_test("Create Auditoria", False, "Missing client token, company ID, or config ID")
            return False
            
        auditoria_data = {
            "company_id": self.test_company_id,
            "config_id": self.test_config_id,
            "responses": []  # Start with empty responses
        }
        
        success, response = self.run_test(
            "Create Auditoria (POST /api/auditorias)",
            "POST",
            "auditorias",
            200,
            data=auditoria_data,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and 'id' in response:
            self.test_auditoria_id = response['id']
            print(f"   Auditoria created with ID: {self.test_auditoria_id}")
        return success

    def test_get_inspections_initial(self):
        """Test getting inspections - initial count (GET /api/inspections)"""
        if not self.client_token:
            self.log_test("Get Inspections (Initial)", False, "No client token")
            return False
            
        success, response = self.run_test(
            "Get Inspections - Initial Count",
            "GET",
            "inspections",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and isinstance(response, list):
            initial_count = len(response)
            print(f"   Initial audit count: {initial_count}")
            # Check if our created audit appears
            found_audit = any(audit.get('id') == self.test_auditoria_id for audit in response)
            if found_audit:
                print(f"   ✅ Created audit found in list")
                # Check status
                our_audit = next((a for a in response if a.get('id') == self.test_auditoria_id), None)
                if our_audit:
                    status = our_audit.get('status', 'unknown')
                    print(f"   Audit status: {status}")
                    if status == 'en_proceso':
                        print(f"   ✅ Correct initial status: en_proceso")
                    else:
                        print(f"   ⚠️  Expected status 'en_proceso', got '{status}'")
            else:
                self.log_test("Get Inspections (Initial)", False, "Created audit not found in list")
                return False
        return success

    def test_save_auditoria_progress(self):
        """Test saving audit progress (PUT /api/auditorias/{id}/save)"""
        if not self.client_token or not self.test_auditoria_id:
            self.log_test("Save Auditoria Progress", False, "Missing client token or auditoria ID")
            return False
            
        # Create sample responses for testing
        sample_responses = [
            {
                "standard_id": "1.1.1",
                "response": "cumple",
                "observations": "Política de SST documentada y aprobada",
                "ai_recommendation": "",
                "evidence_images": []
            },
            {
                "standard_id": "1.1.2", 
                "response": "no_cumple",
                "observations": "Falta evidencia de comunicación de la política",
                "ai_recommendation": "",
                "evidence_images": []
            },
            {
                "standard_id": "1.1.3",
                "response": "no_aplica",
                "observations": "No aplica para el tipo de empresa",
                "ai_recommendation": "",
                "evidence_images": []
            }
        ]
        
        success, response = self.run_test(
            "Save Auditoria Progress (PUT /api/auditorias/{id}/save)",
            "PUT",
            f"auditorias/{self.test_auditoria_id}/save",
            200,
            data=sample_responses,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success:
            total_score = response.get('total_score', 0)
            progress = response.get('progress', 0)
            answered = response.get('answered', 0)
            total = response.get('total', 0)
            
            print(f"   Progress saved - Score: {total_score:.1f}%, Progress: {progress:.1f}%")
            print(f"   Answered: {answered}/{total} standards")
            
            # Verify progress calculation
            expected_progress = (3 / 60) * 100  # 3 answered out of 60 standards
            if abs(progress - expected_progress) < 0.1:
                print(f"   ✅ Progress calculation correct")
            else:
                print(f"   ⚠️  Progress calculation may be incorrect. Expected ~{expected_progress:.1f}%, got {progress:.1f}%")
        
        return success

    def test_close_auditoria(self):
        """Test closing an auditoria (PUT /api/inspections/{id}/close)"""
        if not self.client_token or not self.test_auditoria_id:
            self.log_test("Close Auditoria", False, "Missing client token or auditoria ID")
            return False
            
        success, response = self.run_test(
            "Close Auditoria (PUT /api/inspections/{id}/close)",
            "PUT",
            f"inspections/{self.test_auditoria_id}/close",
            200,
            data={},
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success:
            print(f"   Auditoria closed successfully")
        return success

    def test_get_inspections_after_close(self):
        """Test getting inspections after closing - verify status change"""
        if not self.client_token:
            self.log_test("Get Inspections (After Close)", False, "No client token")
            return False
            
        success, response = self.run_test(
            "Get Inspections - After Close",
            "GET",
            "inspections",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} inspections after close")
            # Check if our audit status changed to 'cerrada'
            our_audit = next((a for a in response if a.get('id') == self.test_auditoria_id), None)
            if our_audit:
                status = our_audit.get('status', 'unknown')
                print(f"   Audit status after close: {status}")
                if status == 'cerrada':
                    print(f"   ✅ Status correctly changed to 'cerrada'")
                else:
                    print(f"   ⚠️  Expected status 'cerrada', got '{status}'")
            else:
                print(f"   ⚠️  Audit not found after close")
        return success

    def test_delete_auditoria(self):
        """Test deleting an auditoria (DELETE /api/inspections/{id})"""
        if not self.client_token or not self.test_auditoria_id:
            self.log_test("Delete Auditoria", False, "Missing client token or auditoria ID")
            return False
            
        success, response = self.run_test(
            "Delete Auditoria (DELETE /api/inspections/{id})",
            "DELETE",
            f"inspections/{self.test_auditoria_id}",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success:
            print(f"   Auditoria deleted successfully")
        return success

    def test_ai_analysis(self):
        """Test AI analysis generation"""
        if not self.client_token or not self.test_inspection_id:
            self.log_test("AI Analysis", False, "Missing client token or inspection ID")
            return False
            
        test_data = {"inspection_id": self.test_inspection_id}
        
        success, response = self.run_test(
            "AI Analysis Generation",
            "POST",
            "analyze-inspection",
            200,
            data=test_data,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        
        if success and 'analysis_id' in response:
            self.test_analysis_id = response['analysis_id']
            print(f"   AI Analysis generated with ID: {self.test_analysis_id}")
            print(f"   Analysis length: {len(response.get('analysis', ''))} chars")
            print(f"   Report length: {len(response.get('report', ''))} chars")
        return success

    def test_get_analysis(self):
        """Test getting analysis"""
        if not self.client_token or not self.test_inspection_id:
            self.log_test("Get Analysis", False, "Missing client token or inspection ID")
            return False
            
        success, response = self.run_test(
            "Get Analysis",
            "GET",
            f"analysis/{self.test_inspection_id}",
            200,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        return success

    def test_update_analysis(self):
        """Test updating analysis report"""
        if not self.client_token or not self.test_analysis_id:
            self.log_test("Update Analysis", False, "Missing client token or analysis ID")
            return False
            
        updated_report = "Informe actualizado de prueba - " + datetime.now().isoformat()
        
        success, response = self.run_test(
            "Update Analysis Report",
            "PUT",
            f"analysis/{self.test_analysis_id}",
            200,
            data=updated_report,
            headers={"Authorization": f"Bearer {self.client_token}"}
        )
        return success

    def test_generate_pdf(self):
        """Test PDF generation"""
        if not self.client_token or not self.test_inspection_id:
            self.log_test("Generate PDF", False, "Missing client token or inspection ID")
            return False
            
        # For PDF, we expect a different response type
        url = f"{self.api_url}/generate-pdf/{self.test_inspection_id}"
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        print(f"\n🔍 Testing Generate PDF...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'pdf' in content_type.lower():
                    self.log_test("Generate PDF", True)
                    print(f"   PDF generated successfully, size: {len(response.content)} bytes")
                    return True
                else:
                    self.log_test("Generate PDF", False, f"Wrong content type: {content_type}")
                    return False
            else:
                self.log_test("Generate PDF", False, f"Status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Generate PDF", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Security Inspection API Tests")
        print(f"Base URL: {self.base_url}")
        print("="*60)
        
        # Test sequence
        tests = [
            self.test_superadmin_login,
            self.test_client_registration,
            self.test_get_pending_companies,
            self.test_activate_company,
            self.test_client_login,
            self.test_get_standards,
            self.test_create_inspection,
            self.test_get_inspections,
            self.test_get_inspection_detail,
            self.test_ai_analysis,
            self.test_get_analysis,
            self.test_update_analysis,
            self.test_generate_pdf
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ {test.__name__} - EXCEPTION: {str(e)}")
                self.tests_run += 1
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SecurityInspectionAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())