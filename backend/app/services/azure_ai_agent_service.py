"""
🤖 Azure AI Agent Service
Azure AI Agents ile entegre chat servisi
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import structlog
from datetime import datetime
import os

try:
    from azure.ai.projects import AIProjectClient
    from azure.identity import DefaultAzureCredential, ClientSecretCredential
    from azure.ai.agents.models import ListSortOrder
    from azure.core.credentials import AzureKeyCredential
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

logger = structlog.get_logger(__name__)


@dataclass
class AzureAgentMessage:
    role: str
    content: str


@dataclass
class AzureAgentRequest:
    messages: List[AzureAgentMessage]
    agent_id: Optional[str] = None
    thread_id: Optional[str] = None


@dataclass
class AzureAgentResponse:
    success: bool
    content: Optional[str] = None
    thread_id: Optional[str] = None
    error_message: Optional[str] = None
    timestamp: str = None
    response_time_ms: Optional[int] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


class AzureAIAgentService:
    """
    Azure AI Agent servisi
    Agent219 ile iletişim kurar
    """
    
    def __init__(
        self,
        endpoint: Optional[str] = None,
        agent_id: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        """
        Args:
            endpoint: Azure AI Projects endpoint URL
            agent_id: Azure AI Agent ID (asst_xxx formatında)
            api_key: Azure API Key (opsiyonel, CLI yerine kullanılabilir)
        """
        if not AZURE_AVAILABLE:
            logger.warning("⚠️ Azure AI packages not installed. Install: pip install azure-ai-projects azure-identity")
            self.is_available = False
            return
        
        self.endpoint = endpoint or os.getenv(
            "AZURE_AI_ENDPOINT",
            "https://kynux-mhgmg52x-eastus2.services.ai.azure.com/api/projects/kynux-mhgmg52x-eastus2-project"
        )
        
        self.agent_id = agent_id or os.getenv(
            "AZURE_AGENT_ID",
            "asst_AJg6SvBS1cDAnzJLl53ht6rs"
        )
        
        try:
            # Kimlik doğrulama yöntemini belirle
            credential = self._get_credential(api_key)
            
            self.client = AIProjectClient(
                credential=credential,
                endpoint=self.endpoint
            )
            self.agent = self.client.agents.get_agent(self.agent_id)
            self.is_available = True
            logger.info("✅ Azure AI Agent Service initialized", agent_id=self.agent_id)
        except Exception as e:
            logger.error(f"❌ Azure AI Agent initialization failed: {str(e)}")
            self.is_available = False
    
    
    def _get_credential(self, api_key: Optional[str] = None):
        """
        Kimlik doğrulama metodunu belirle
        
        Öncelik sırası:
        1. API Key (env var veya parametre)
        2. Service Principal (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)
        3. DefaultAzureCredential (Azure CLI, Managed Identity, vb.)
        """
        # 1. API Key kontrolü
        api_key = api_key or os.getenv("AZURE_API_KEY")
        if api_key:
            logger.info("🔑 Using Azure API Key authentication")
            return AzureKeyCredential(api_key)
        
        # 2. Service Principal kontrolü
        client_id = os.getenv("AZURE_CLIENT_ID")
        client_secret = os.getenv("AZURE_CLIENT_SECRET")
        tenant_id = os.getenv("AZURE_TENANT_ID")
        
        if client_id and client_secret and tenant_id:
            logger.info("🔐 Using Service Principal authentication")
            return ClientSecretCredential(
                tenant_id=tenant_id,
                client_id=client_id,
                client_secret=client_secret
            )
        
        # 3. Default Azure Credential (Azure CLI, Managed Identity, vb.)
        logger.info("🔓 Using DefaultAzureCredential (Azure CLI required)")
        return DefaultAzureCredential()
    
    
    async def chat_completion(
        self,
        request: AzureAgentRequest
    ) -> AzureAgentResponse:
        """
        Azure AI Agent ile sohbet
        
        Args:
            request: Azure Agent isteği
            
        Returns:
            AzureAgentResponse: Agent yanıtı
        """
        if not self.is_available:
            return AzureAgentResponse(
                success=False,
                error_message="Azure AI Agent service is not available. Install required packages."
            )
        
        start_time = datetime.now()
        
        try:
            # Thread oluştur veya mevcut thread'i kullan
            if request.thread_id:
                thread_id = request.thread_id
                logger.info(f"📝 Using existing thread: {thread_id}")
            else:
                thread = self.client.agents.threads.create()
                thread_id = thread.id
                logger.info(f"📝 Created new thread: {thread_id}")
            
            # Kullanıcı mesajını gönder
            last_message = request.messages[-1]
            message = self.client.agents.messages.create(
                thread_id=thread_id,
                role=last_message.role,
                content=last_message.content
            )
            
            # Agent'ı çalıştır
            run = self.client.agents.runs.create_and_process(
                thread_id=thread_id,
                agent_id=self.agent_id
            )
            
            # Yanıtı kontrol et
            if run.status == "failed":
                error_msg = f"Agent run failed: {run.last_error}"
                logger.error(f"❌ {error_msg}")
                return AzureAgentResponse(
                    success=False,
                    thread_id=thread_id,
                    error_message=error_msg
                )
            
            # Mesajları al
            messages = self.client.agents.messages.list(
                thread_id=thread_id,
                order=ListSortOrder.ASCENDING
            )
            
            # En son assistant yanıtını bul
            assistant_response = None
            for msg in reversed(list(messages)):
                if msg.role == "assistant" and msg.text_messages:
                    assistant_response = msg.text_messages[-1].text.value
                    break
            
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            if assistant_response:
                logger.info(
                    f"✅ Azure Agent response generated",
                    thread_id=thread_id,
                    response_time_ms=response_time
                )
                
                return AzureAgentResponse(
                    success=True,
                    content=assistant_response,
                    thread_id=thread_id,
                    response_time_ms=response_time
                )
            else:
                return AzureAgentResponse(
                    success=False,
                    thread_id=thread_id,
                    error_message="No assistant response found",
                    response_time_ms=response_time
                )
        
        except Exception as e:
            error_msg = f"Azure Agent error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return AzureAgentResponse(
                success=False,
                error_message=error_msg,
                response_time_ms=response_time
            )
    
    
    def get_service_info(self) -> Dict[str, Any]:
        """
        Servis bilgilerini döndür
        """
        return {
            "service": "Azure AI Agent",
            "available": self.is_available,
            "endpoint": self.endpoint if self.is_available else None,
            "agent_id": self.agent_id if self.is_available else None,
            "packages_installed": AZURE_AVAILABLE
        }


# Singleton instance
_azure_agent_service: Optional[AzureAIAgentService] = None


def get_azure_agent_service() -> AzureAIAgentService:
    """
    Azure AI Agent servisinin singleton instance'ını döndür
    """
    global _azure_agent_service
    
    if _azure_agent_service is None:
        _azure_agent_service = AzureAIAgentService()
    
    return _azure_agent_service

